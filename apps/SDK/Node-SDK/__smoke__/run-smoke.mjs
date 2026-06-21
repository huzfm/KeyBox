// End-to-end smoke test for the 402 request-gating behavior.
//
// Reproduces the user's reported failure modes:
//   PHASE 1 — Server reports REVOKED + activation refused:
//     - Customer registers their routes BEFORE calling protectNodeApp
//     - The .instance-id on disk was written by a previous successful
//       activation (so the daemon can validate this run)
//     - The fake license server reports the key as REVOKED
//     - Requests must come back as HTTP 402 with the rejection body
//
//   PHASE 2 — Cold start with server unreachable:
//     - No .instance-id on disk
//     - Server's /validate/activate is unreachable (connection refused)
//     - The state must NOT stay at "unknown" or "pending_validation"
//       as a free-pass — requests must be blocked with 402 until the
//       server responds with a valid result.
//
// Plus the recovery case:
//   - Flipping state back to VALID lets the next request through
//     without restarting the process.

import express from "express";
import { writeFileSync, unlinkSync } from "node:fs";

// --- Fake license server (Phase 1: REVOKED) -----------------------------
const fakeServerState = {
    valid: false,
    status: "revoked",
    message: "License has been revoked by the developer.",
};

const fakeApi = express();
fakeApi.use(express.json());
fakeApi.post("/validate", (_req, res) => res.json(fakeServerState));
fakeApi.post("/validate/activate", (_req, res) =>
    res.json({ success: false, message: "Cannot activate a revoked license" }),
);

const fakeApiServer = await new Promise((resolve) => {
    const s = fakeApi.listen(0, "127.0.0.1", () => resolve(s));
});
const apiUrl = `http://127.0.0.1:${fakeApiServer.address().port}`;

// --- Pre-existing activation marker on disk -----------------------------
// Simulates an app that was activated in a previous run.
writeFileSync(".instance-id", "fake-instance-uuid-from-previous-run", "utf8");

// --- Load SDK ----------------------------------------------------------
const sdkPath = new URL("../index.js", import.meta.url).href;
const sdk = await import(sdkPath);

// --- Customer app: routes registered BEFORE protectNodeApp --------------
// This is the exact pattern in the user's bug report.
const app = express();
app.get("/", (_req, res) => res.send("OK home"));
app.get("/api/users", (_req, res) => res.json({ users: [] }));
app.get("/health", (_req, res) => res.json({ ok: true }));

await sdk.protectNodeApp({
    app,
    port: 0,
    productName: "smoke-test",
    key: "fake-key",
    apiUrl,
});

const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}`;

const fetchIt = async (path) => {
    const r = await fetch(base + path);
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, body };
};

// fetchJson takes an explicit base URL so it's not tied to the
// closure of Phase 1's `base`. Used by Phase 2 which runs against a
// different server instance.
const fetchJson = async (url) => {
    const r = await fetch(url);
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, body };
};

const results = {
    home: await fetchIt("/"),
    users: await fetchIt("/api/users"),
    health: await fetchIt("/health"),
    state: sdk.getLicenseState(),
};

// --- Recovery: flip state to VALID and re-request ----------------------
fakeServerState.valid = true;
fakeServerState.status = "active";
sdk.setLicenseState(sdk.LicenseState.VALID);

results.home_after_renew = await fetchIt("/");
results.users_after_renew = await fetchIt("/api/users");
results.state_after_renew = sdk.getLicenseState();

server.close();
fakeApiServer.close();
sdk.stopLicenseDaemon();

try { unlinkSync(".instance-id"); } catch {}

console.log(JSON.stringify(results, null, 2));

let pass = true;
const expect = (label, got, predicate) => {
    if (!predicate(got)) {
        console.error(`FAIL: ${label} -> ${JSON.stringify(got)}`);
        pass = false;
    }
};

expect("state should be revoked", results.state, (s) => s === "revoked");
expect("home (revoked)", results.home, (r) =>
    r.status === 402 && JSON.stringify(r.body).includes("Please pay your developer"),
);
expect("users (revoked)", results.users, (r) =>
    r.status === 402 && JSON.stringify(r.body).includes("Please pay your developer"),
);
expect("health (bypass)", results.health, (r) => r.status === 200);
expect("home after renew", results.home_after_renew, (r) => r.status === 200);
expect("users after renew", results.users_after_renew, (r) => r.status === 200);
expect("state after renew should be valid", results.state_after_renew, (s) => s === "valid");

if (!pass) {
    console.error("PHASE 1 FAIL");
    process.exit(1);
}
console.log("PHASE 1 ALL PASS");

// PHASE 2: cold-start with an unreachable server.
//
// We close the fake server so the SDK's /validate/activate and
// /validate calls all fail. The SDK must NOT silently serve traffic
// just because it can't reach the server — it must block with 402.
console.log("\n--- PHASE 2: cold-start, server unreachable ---");

// Hard timeout so a misbehaving fetch/interval can't hang the suite.
const phase2Deadline = setTimeout(() => {
    console.error("PHASE 2 TIMEOUT (15s) — fetch or setInterval kept the event loop alive");
    process.exit(2);
}, 15_000);

const phase2 = {};
try { unlinkSync(".instance-id"); } catch {}

const app2 = express();
sdk.setLicenseState("pending_validation");

// Mount the guard BEFORE routes so it intercepts everything.
// (protectNodeApp does this via promoteMiddlewareToFront; we mirror
// that here for the manual-mounting smoke test.)
app2.use(sdk.licenseGuard());

app2.get("/", (_req, res) => res.send("OK home"));
app2.get("/api/users", (_req, res) => res.json({ users: [] }));
app2.get("/health", (_req, res) => res.json({ ok: true }));

let phase2Server;
try {

    // startLicenseDaemon will fail on first /validate because the
    // fake server is closed. That transitions lastState from
    // pending_validation -> invalid.
    await sdk.startLicenseDaemon({
        productName: "Phase2 Product",
        key: "phase2-key",
        apiUrl, // already closed
        intervalSeconds: 999, // don't double-tick during the test
    });

    // Note: we don't unlink .instance-id between phases; Phase 1's
    // unlinkSync (line 100) already removed it. The SDK will warn
    // "No .instance-id on disk" but that's fine for the test.

    phase2Server = await new Promise((resolve) => {
        const s = app2.listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = `http://127.0.0.1:${phase2Server.address().port}`;

    phase2.state_after_startup = sdk.getLicenseState();
    phase2.home = await fetchJson(`${base}/`);
    phase2.users = await fetchJson(`${base}/api/users`);
    phase2.health = await fetchJson(`${base}/health`);
} finally {
    if (phase2Server) await new Promise((r) => phase2Server.close(r));
    sdk.stopLicenseDaemon();
}

console.log(JSON.stringify(phase2, null, 2));

const phase2Pass =
    phase2.state_after_startup !== "valid" &&
    phase2.state_after_startup !== "unknown" &&
    phase2.home?.status === 402 &&
    phase2.users?.status === 402 &&
    phase2.health?.status === 200;

if (!phase2Pass) {
    console.error("PHASE 2 FAIL");
    process.exit(1);
}
console.log("PHASE 2 ALL PASS");

clearTimeout(phase2Deadline);

// Both phases complete — exit explicitly so the daemon's
// setInterval (cleared above) and any leftover express connections
// don't keep the event loop alive past the assertions.
process.exit(0);
