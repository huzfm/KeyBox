import fetch from "node-fetch"
import { randomUUID } from "crypto"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

let intervalId = null

// State manager — single source of truth for license state.
// Customers can read this via getLicenseState() to render their own
// UI; the licenseGuard() middleware reads from the same store.
// We initialize with the literal "pending_validation" because the
// LicenseState const is declared below this line, and we don't want
// to reorder the module's top-level layout. (ES module hoisting would
// otherwise throw "Cannot access 'LicenseState' before initialization".)
let lastState = "pending_validation"

export const LicenseState = Object.freeze({
     VALID: "valid",
     EXPIRED: "expired",
     REVOKED: "revoked",
     INVALID: "invalid",
     UNKNOWN: "unknown",
     // Initial state before the daemon has run its first successful
     // tick. Requests are BLOCKED in this state — we never want the
     // customer's app to silently serve traffic just because we
     // haven't heard from the server yet. The previous behavior of
     // letting UNKNOWN through was the root cause of "license is
     // revoked but requests still succeed" when the first /validate
     // call fails.
     PENDING_VALIDATION: "pending_validation",
})

export function getLicenseState() {
     return lastState
}

export function setLicenseState(state) {
     const allowed = Object.values(LicenseState)
     if (!allowed.includes(state)) {
          log("WARN", "Ignoring invalid license state", { state, allowed })
          return
     }
     lastState = state
}

const INACTIVE_STATES = new Set([
     LicenseState.EXPIRED,
     LicenseState.REVOKED,
     LicenseState.INVALID,
])

// Paths that should never be blocked by the license guard. Customers
// can extend this list via the `bypassPaths` option to protectNodeApp.
const DEFAULT_BYPASS_PATHS = ["/health", "/license/status"]

function matchesBypass(pathname, bypassPaths) {
     if (!pathname) return false
     for (const pattern of bypassPaths) {
          if (pattern === pathname) return true
          // Prefix match: "/license" matches "/license/renew", "/license/x/y"
          if (pattern.endsWith("/") && pathname.startsWith(pattern)) return true
          if (!pattern.endsWith("/") && pathname.startsWith(pattern + "/"))
               return true
     }
     return false
}

// ─── Pretty console output ──────────────────────────────────────────────
// ANSI colors — no extra dependency needed, every modern terminal supports these.
const COLORS = {
     reset: "\x1b[0m",
     dim: "\x1b[2m",
     bold: "\x1b[1m",
     cyan: "\x1b[36m",
     green: "\x1b[32m",
     yellow: "\x1b[33m",
     red: "\x1b[31m",
     gray: "\x1b[90m",
     magenta: "\x1b[35m",
}

const LEVEL_STYLES = {
     INFO: { color: COLORS.cyan, icon: "ℹ" },
     SUCCESS: { color: COLORS.green, icon: "✔" },
     WARN: { color: COLORS.yellow, icon: "⚠" },
     ERROR: { color: COLORS.red, icon: "✖" },
}

function log(level, message, meta = {}) {
     const timestamp = new Date().toLocaleString("en-IN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
     })

     const levelKey = level.toUpperCase()
     const style = LEVEL_STYLES[levelKey] || { color: COLORS.reset, icon: "•" }

     const tag = `${style.color}${style.icon} ${levelKey.padEnd(7)}${COLORS.reset}`
     const time = `${COLORS.gray}${timestamp}${COLORS.reset}`
     const msg = `${COLORS.bold}${message}${COLORS.reset}`

     let metaLines = ""
     if (Object.keys(meta).length) {
          metaLines =
               "\n" +
               Object.entries(meta)
                    .map(
                         ([k, v]) =>
                              `${COLORS.dim}      ${k}: ${COLORS.reset}${formatMetaValue(v)}`,
                    )
                    .join("\n")
     }

     console.log(`${tag} ${time}  ${msg}${metaLines}`)
}

function formatMetaValue(value) {
     if (value && typeof value === "object") {
          try {
               return JSON.stringify(value)
          } catch {
               return String(value)
          }
     }
     return String(value)
}

function printBanner(title, color = COLORS.cyan) {
     const line = "─".repeat(Math.max(title.length + 4, 40))
     console.log(`${color}${line}${COLORS.reset}`)
     console.log(`${color}  ${COLORS.bold}${title}${COLORS.reset}`)
     console.log(`${color}${line}${COLORS.reset}`)
}
// ─────────────────────────────────────────────────────────────────────────

// Thrown when the server confirms the license is already bound to a
// different (machineId, instanceId) pair. Consumers can catch this to
// show a friendlier message and avoid persisting any local state.
export class LicenseAlreadyActivatedError extends Error {
     constructor(message) {
          super(message)
          this.name = "LicenseAlreadyActivatedError"
          this.code = "LICENSE_ALREADY_ACTIVATED"
     }
}

// Returns the on-disk instance id, or null if none exists yet.
// We deliberately do NOT generate + persist on the first call — the
// id is only written to disk after the server confirms activation.
function readStoredInstanceId() {
     const filePath = join(process.cwd(), ".instance-id")
     try {
          return readFileSync(filePath, "utf8").trim() || null
     } catch {
          return null
     }
}

// Persists the given id to <cwd>/.instance-id. Uses an exclusive-create
// flag so a concurrent process can't clobber its own id with ours.
function persistInstanceId(id) {
     const filePath = join(process.cwd(), ".instance-id")
     try {
          writeFileSync(filePath, id, { encoding: "utf8", flag: "wx" })
     } catch (err) {
          if (err && err.code === "EEXIST") {
               // Someone (another instance, or a previous successful run)
               // already wrote a file. Leave it as-is.
               return
          }
          // Other I/O errors: re-read to confirm what's on disk.
          const existing = readStoredInstanceId()
          if (existing !== id) {
               // Different content — don't clobber, just log.
               log(
                    "WARN",
                    "Could not persist .instance-id; keeping existing value",
                    {
                         path: filePath,
                    },
               )
          }
     }
}

// Returns a usable instance id for an outgoing request: the stored one
// if present, otherwise a fresh candidate that has NOT been written to
// disk yet. The caller is responsible for calling persistInstanceId()
// once the server confirms activation.
function getCandidateInstanceId() {
     return readStoredInstanceId() || randomUUID()
}

// Read-only check: ask the server whether the license is already
// activated for the (machineId, instanceId) we'd be sending. Returns
// `{ status, active, data }` where `active` is true ONLY when the
// server says `valid: true` AND status === "active" for the stored
// instance id. Callers use this to decide whether activation is
// actually needed on cold start.
export async function checkLicenseStatus({
     productName,
     key,
     apiUrl = "http://localhost:5000",
     endpoint = "/validate",
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     const instanceId = readStoredInstanceId()

     // No .instance-id on disk → never activated from this app, so
     // there's nothing the server can confirm. Caller should activate.
     if (!instanceId) {
          return {
               status: "not_activated",
               active: false,
               data: null,
          }
     }

     log("INFO", "Checking license status", { productName })

     const res = await fetch(`${apiUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, productName, instanceId }),
     })

     const data = await res.json().catch(() => null)

     // See note in startLicenseDaemon about defensive string coercion.
     const rawStatus =
          data && typeof data.status === "string" ? data.status : ""
     const statusLower = (rawStatus || "unknown").toLowerCase()
     const isActive = data?.valid === true && statusLower === "active"

     return {
          status: statusLower,
          active: isActive,
          data,
     }
}

export async function activateLicense({
     productName,
     key,
     apiUrl = "http://localhost:5000",
     endpoint = "/validate/activate",
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     const instanceId = getCandidateInstanceId()

     log("INFO", "Activating license", { productName })

     const res = await fetch(`${apiUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, productName, instanceId }),
     })

     const data = await res.json().catch(() => {
          throw new Error("License server did not return JSON")
     })

     if (!res.ok || data?.success === false) {
          const message = data?.message || "License activation failed"

          // Log the full server response so we can see exactly why the
          // server rejected activation. The previous behavior swallowed
          // the real message behind "License activation failed" which
          // made it impossible to debug activation issues.
          log("ERROR", "License server rejected activation", {
               httpStatus: res.status,
               serverMessage: message,
               serverData: data,
          })

          // Distinguish "bound to a different instance" from generic failure
          // so the consuming app can show a clearer message. We accept a
          // few common server-side phrasings ("bound to another instance",
          // "active on another device", "already activated on another
          // machine", etc.) — not just the literal "another instance".
          if (
               res.status === 403 &&
               typeof message === "string" &&
               /another\s+(instance|device|machine)|already\s+(activated|active|bound)/i.test(
                    message,
               )
          ) {
               throw new LicenseAlreadyActivatedError(message)
          }

          throw new Error(message)
     }

     // Server accepted this (machineId, instanceId) pair. Safe to commit
     // the id to disk now — only on a real success do we make it sticky.
     if (!readStoredInstanceId()) {
          persistInstanceId(instanceId)
     }

     log("INFO", "License activated")
     return data
}

const DEFAULT_INTERVAL = 2 // 15 minutes

export async function startLicenseDaemon({
     productName,
     key,
     apiUrl = "http://localhost:5000",
     endpoint = "/validate",
     onRevoke,
     onRecover,
     // Override the daemon's poll interval (default 2s in dev).
     // Useful for tests and for customers who want a different cadence
     // in production. Must be a positive integer.
     intervalSeconds = DEFAULT_INTERVAL,
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     // Daemon is read-only: never generate a new id here. If none is on
     // disk and none was bound by an earlier activation, every /validate
     // call would 400 (server requires instanceId) — that's the right
     // signal: the user must run activation first.
     const instanceId = readStoredInstanceId()

     async function validateOnce() {
          log("INFO", "Validating license", { productName })

          if (!instanceId) {
               log("WARN", "No .instance-id on disk — run activation first")
               return
          }

          try {
               const res = await fetch(`${apiUrl}${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key, productName, instanceId }),
               })

               const data = await res.json().catch(() => {
                    throw new Error("Non-JSON response from license server")
               })

               // Coerce defensively: the server may return status as a
               // string, an object, null, or missing entirely. Anything
               // non-string would crash .toLowerCase() and force the
               // daemon into a permanent "unknown" loop. String(...) is
               // safe for all primitive + object values.
               const rawStatus =
                    data && typeof data.status === "string"
                         ? data.status
                         : ""
               const statusLower = (rawStatus || "unknown").toLowerCase()

               // Translate server status into our internal LicenseState.
               // We preserve the raw distinction (expired vs revoked vs
               // invalid) so the guard middleware can return the right one
               // in the 402 response body.
               let nextState
               if (data.valid === true) {
                    nextState = LicenseState.VALID
               } else if (INACTIVE_STATES.has(statusLower)) {
                    nextState = statusLower
               } else if (
                    statusLower === "server_error" ||
                    statusLower === "error"
               ) {
                    nextState = LicenseState.UNKNOWN
               } else {
                    nextState = LicenseState.UNKNOWN
               }

               if (nextState !== lastState) {
                    if (nextState === LicenseState.VALID) {
                         log(
                              "INFO",
                              "License state changed to VALID — requests will be accepted",
                              {
                                   from: lastState,
                                   to: nextState,
                              },
                         )
                    } else if (INACTIVE_STATES.has(nextState)) {
                         log(
                              "ERROR",
                              `License state changed to ${nextState.toUpperCase()} — requests will be rejected with 402`,
                              {
                                   from: lastState,
                                   to: nextState,
                                   serverMessage: data.message,
                              },
                         )
                    } else {
                         log("WARN", "License state changed to UNKNOWN", {
                              from: lastState,
                              to: nextState,
                         })
                    }
                    const previousState = lastState
                    lastState = nextState

                    // Fire the appropriate callback. The legacy `onRevoke`
                    // hook still fires on any transition to an inactive
                    // state (for customers who wired it up to do something
                    // custom like display a banner). For renewals, we fire
                    // `onRecover` so customers can do their own UX.
                    if (
                         INACTIVE_STATES.has(nextState) &&
                         !INACTIVE_STATES.has(previousState)
                    ) {
                         onRevoke?.(data)
                    } else if (
                         nextState === LicenseState.VALID &&
                         INACTIVE_STATES.has(previousState)
                    ) {
                         onRecover?.(data)
                    }
               }
          } catch (err) {
               log("WARN", "License check failed — keeping app running", {
                    error: err.message,
               })
               // Network/protocol failure on startup: transition out of
               // PENDING_VALIDATION so the guard definitively blocks
               // requests and the customer sees an explicit INACTIVE
               // state in the logs.
               if (lastState === LicenseState.PENDING_VALIDATION) {
                    lastState = LicenseState.INVALID
                    log(
                         "ERROR",
                         "License daemon could not reach the server on startup — requests will be rejected with 402 until the server is reachable",
                         {
                              from: LicenseState.PENDING_VALIDATION,
                              to: LicenseState.INVALID,
                         },
                    )
               }
          }
     }

     await validateOnce()

     // Daemon keeps running regardless of state. The middleware/guard
     // is what blocks traffic — never the process lifecycle.
     intervalId = setInterval(validateOnce, intervalSeconds * 1000)

     log("INFO", "License daemon started", {
          intervalSeconds,
     })
}

export function stopLicenseDaemon() {
     if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
     }
     log("INFO", "License daemon stopped")
}

// Express middleware that rejects every request with HTTP 402 when
// the current license state is not VALID. Read-only — never mutates
// state. Customers can mount this themselves; otherwise
// `protectNodeApp` auto-registers it.
//
// `bypassPaths` is an optional array of path prefixes that skip the
// guard (defaults to /health and /license/status are always included).
export function licenseGuard({ bypassPaths = [] } = {}) {
     const allowedPaths = [...DEFAULT_BYPASS_PATHS, ...bypassPaths]

     return function guard(req, res, next) {
          const state = getLicenseState()

          // Only VALID lets traffic through. Every other state —
          // PENDING_VALIDATION, UNKNOWN, REVOKED, EXPIRED, INVALID —
          // gets a 402. Previously we let UNKNOWN through as a "cold
          // start" grace period, but that meant if the daemon never
          // successfully reached the server (e.g. activation failed),
          // the customer's app would silently serve traffic forever
          // with no license. PENDING_VALIDATION is the explicit cold
          // start state, and it BLOCKS.
          if (state === LicenseState.VALID) {
               return next()
          }

          if (matchesBypass(req.path, allowedPaths)) {
               return next()
          }

          return res.status(402).json({
               error: "LICENSE_INACTIVE",
               state,
               message: "Please pay your developer",
               renewContact: "support@keybox.dev",
          })
     }
}

export async function protectNodeApp({
     app,
     port,
     productName,
     key,
     apiUrl,
     bypassPaths,
}) {
     if (!app) throw new Error("Express app instance is required")
     if (port === undefined || port === null)
          throw new Error("port is required")

     // Register the guard, then PROMOTE it to the very front of the
     // Express middleware stack. This matters: if the customer
     // registered their own routes BEFORE calling protectNodeApp, a
     // plain `app.use(licenseGuard)` would be appended to the end of
     // the stack — and Express only runs later middleware if the route
     // handler calls `next()`. Route handlers that send a response
     // directly would bypass our guard entirely, which is exactly the
     // "license revoked but requests still pass" failure mode we are
     // fixing here.
     const guard = licenseGuard({ bypassPaths })
     app.use(guard)
     promoteMiddlewareToFront(app, guard)

     // Avoid duplicate activation on cold start: if the server already
     // confirms this (machineId, instanceId) is active, skip the
     // /validate/activate call entirely and go straight to the daemon.
     //
     // We deliberately do NOT throw on activation failure. If the
     // license is already revoked, the server will refuse to activate
     // — but the customer's app should still come up so the guard can
     // serve 402 responses and so that, once the customer pays, the
     // next daemon tick flips state back to VALID without a restart.
     try {
          const status = await checkLicenseStatus({ productName, key, apiUrl })
          if (status.active) {
               log(
                    "INFO",
                    "License already active on this instance — skipping activation",
                    {
                         status: status.status,
                    },
               )
          } else {
               log("INFO", "License not active — activating", {
                    status: status.status,
               })
               await activateLicense({ productName, key, apiUrl })
          }
     } catch (err) {
          if (err instanceof LicenseAlreadyActivatedError) {
               log(
                    "ERROR",
                    "License is already activated on another device. Requests will be rejected with 402 until this is resolved.",
                    {
                         reason: err.message,
                    },
               )
          } else {
               log(
                    "ERROR",
                    "Failed to activate license. Starting the app anyway — requests will be rejected with 402 until activation succeeds.",
                    {
                         reason: err.message,
                    },
               )
          }
          // Do not re-throw. The guard is already wired up; the daemon
          // will retry on its next tick. The server still starts so
          // /health stays reachable and renewals are observed.
     }

     app.listen(port, () => {
          log("INFO", `Licensed app running at http://localhost:${port}`)
     })

     // Daemon just feeds the state manager; the guard middleware does
     // the enforcement. No server.close() or process.exit() on state
     // change — when the license is renewed, the next tick flips state
     // back to VALID and the next request succeeds without a restart.
     await startLicenseDaemon({ productName, key, apiUrl })
}

// Move a just-registered middleware function to the very front of the
// Express app's router stack so it runs before any customer-registered
// routes or middleware. This is what makes the 402 gate actually take
// effect even when the customer has already wired up their API.
//
// Express stores middleware in `app._router.stack` as `{ route, handle,
// name, ... }` layer objects. We splice the matching layer to index 0.
//
// We tolerate missing internals gracefully — if Express ever changes
// its internal layout, we fall back to a `process.emitWarning` so
// customers still see the original `app.use(licenseGuard())` we added.
function promoteMiddlewareToFront(app, middlewareFn) {
     try {
          const router = app._router || app.router
          if (!router || !Array.isArray(router.stack)) {
               log(
                    "WARN",
                    "Could not promote license guard to front of middleware stack — Express internals changed",
               )
               return
          }
          const stack = router.stack

          // Find our guard layer.
          let idx = -1
          for (let i = 0; i < stack.length; i++) {
               if (stack[i].handle === middlewareFn) {
                    idx = i
                    break
               }
          }
          if (idx < 0) return // not found; app.use may have failed silently

          // Express ships several built-in middlewares that must run
          // before any user middleware because they set up the req/res
          // prototypes. Currently `query` and `init` are prepended by
          // Express when the app is created (or first used). If we
          // splice our guard before them, `res` arrives as a raw
          // http.ServerResponse with no `.status`, `.json`, etc.
          //
          // Strategy: find the LAST built-in middleware in the stack
          // and insert our guard immediately after it. We identify
          // built-ins by the fact they have a `name` matching one of
          // Express's known built-ins AND no `route` (they were added
          // via app.use internally).
          const BUILTIN_NAMES = new Set(["query", "init", "expressInit"])
          let lastBuiltinIdx = -1
          for (let i = 0; i < stack.length; i++) {
               const layer = stack[i]
               const name = layer.name || (layer.handle && layer.handle.name)
               if (name && BUILTIN_NAMES.has(name) && !layer.route) {
                    lastBuiltinIdx = i
               }
          }
          const target = lastBuiltinIdx + 1
          if (idx === target) return

          const [layer] = stack.splice(idx, 1)
          // After splicing, indices above the removal point shifted
          // down by 1. Re-clamp the insertion index.
          const insertAt = Math.min(target, stack.length)
          stack.splice(insertAt, 0, layer)
          log(
               "INFO",
               "Promoted license guard to run after Express built-in middlewares",
               {
                    from: idx,
                    to: insertAt,
                    builtinsFound:
                         lastBuiltinIdx >= 0
                              ? stack
                                     .slice(0, lastBuiltinIdx + 1)
                                     .map(
                                          (l) =>
                                               l.name ||
                                               (l.handle && l.handle.name),
                                     )
                                     .filter(Boolean)
                              : [],
                    totalLayers: stack.length,
               },
          )
     } catch (err) {
          log("WARN", "Failed to promote license guard", { error: err.message })
     }
}
