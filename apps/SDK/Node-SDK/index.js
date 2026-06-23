import fetch from "node-fetch"
import { randomUUID } from "crypto"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

let intervalId = null

// State manager — single source of truth for license state.
// Customers can read this via getLicenseState() to render their own
// UI; the licenseGuard() middleware reads from the same store.
// We initialize with "pending_validation" — the explicit cold-start
// state. Requests are BLOCKED until the first successful daemon tick
// confirms the license is ACTIVE.
let lastState = "pending_validation"

// States mirror the server's Status enum exactly so there is no
// impedance mismatch between what the server sends and what the SDK
// stores. The only SDK-internal state that has no server counterpart
// is PENDING_VALIDATION (the cold-start sentinel).
export const LicenseState = Object.freeze({
     // Server reports the license was created but not activated yet.
     PENDING: "PENDING",
     // License is valid and active — the ONLY state that lets traffic through.
     ACTIVE: "ACTIVE",
     // License has passed its expiry date.
     EXPIRED: "EXPIRED",
     // License was explicitly revoked by the developer.
     REVOKED: "REVOKED",
     // Internal SDK sentinel: set on startup before the first successful
     // response from the license server. Requests are BLOCKED in this
     // state so the app never silently serves traffic before the license
     // has been confirmed.
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

// States that definitively indicate the license is not usable.
// Requests are blocked (HTTP 402) whenever the current state is in this set.
const INACTIVE_STATES = new Set([
     LicenseState.EXPIRED,
     LicenseState.REVOKED,
     LicenseState.PENDING,
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

// Pretty console output
// ANSI colors
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
// server says `valid: true` AND status === "ACTIVE" for the stored
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

     const rawStatus =
          data && typeof data.status === "string" ? data.status : ""
     const statusUpper = rawStatus.toUpperCase()
     const isActive = data?.valid === true && statusUpper === "ACTIVE"

     return {
          status: statusUpper,
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

          log("ERROR", "License server rejected activation", {
               httpStatus: res.status,
               serverMessage: message,
               serverData: data,
          })

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

const DEFAULT_INTERVAL = 900 // seconds (dev default)

export async function startLicenseDaemon({
     productName,
     key,
     apiUrl = "http://localhost:5000",
     endpoint = "/validate",
     onRevoke,
     onRecover,
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
               // non-string would crash .toUpperCase(). Compare uppercase
               // to match the server's Status enum exactly.
               const rawStatus =
                    data && typeof data.status === "string" ? data.status : ""
               const statusUpper = rawStatus.toUpperCase()

               // Translate server status into our internal LicenseState.
               // Valid server statuses: PENDING, ACTIVE, EXPIRED, REVOKED.
               // Any unrecognised response is treated as a transient error —
               // we keep the last known state rather than blocking access or
               // transitioning to a synthetic UNKNOWN state.
               let nextState
               if (data.valid === true && statusUpper === "ACTIVE") {
                    nextState = LicenseState.ACTIVE
               } else if (statusUpper === LicenseState.REVOKED) {
                    nextState = LicenseState.REVOKED
               } else if (statusUpper === LicenseState.EXPIRED) {
                    nextState = LicenseState.EXPIRED
               } else if (statusUpper === LicenseState.PENDING) {
                    nextState = LicenseState.PENDING
               } else {
                    // Unrecognised response (server error, unexpected payload,
                    // etc.) — do NOT change state. Keep whatever we had before
                    // so a single bad response doesn't block a live app.
                    log(
                         "WARN",
                         "Unrecognised license server response — keeping current state",
                         {
                              currentState: lastState,
                              serverStatus: rawStatus,
                              serverValid: data.valid,
                         },
                    )
                    return
               }

               if (nextState !== lastState) {
                    if (nextState === LicenseState.ACTIVE) {
                         log(
                              "INFO",
                              "License state changed to ACTIVE — requests will be accepted",
                              {
                                   from: lastState,
                                   to: nextState,
                              },
                         )
                    } else if (INACTIVE_STATES.has(nextState)) {
                         log(
                              "ERROR",
                              `License state changed to ${nextState} — requests will be rejected with 402`,
                              {
                                   from: lastState,
                                   to: nextState,
                                   serverMessage: data.message,
                              },
                         )
                    } else {
                         log("INFO", `License state changed to ${nextState}`, {
                              from: lastState,
                              to: nextState,
                         })
                    }
                    const previousState = lastState
                    lastState = nextState

                    // Fire the appropriate callback. `onRevoke` fires on any
                    // transition into an inactive state. `onRecover` fires when
                    // the license transitions back to ACTIVE.
                    if (
                         INACTIVE_STATES.has(nextState) &&
                         !INACTIVE_STATES.has(previousState)
                    ) {
                         onRevoke?.(data)
                    } else if (
                         nextState === LicenseState.ACTIVE &&
                         INACTIVE_STATES.has(previousState)
                    ) {
                         onRecover?.(data)
                    }
               }
          } catch (err) {
               log("WARN", "License check failed — keeping current state", {
                    error: err.message,
               })
               // Network/protocol failure on startup: transition out of
               // PENDING_VALIDATION so the guard definitively blocks requests.
               if (lastState === LicenseState.PENDING_VALIDATION) {
                    lastState = LicenseState.REVOKED
                    log(
                         "ERROR",
                         "License daemon could not reach the server on startup — requests will be rejected with 402 until the server is reachable",
                         {
                              from: LicenseState.PENDING_VALIDATION,
                              to: LicenseState.REVOKED,
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
// the current license state is not ACTIVE. Read-only — never mutates
// state. Customers can mount this themselves; otherwise
// `protectNodeApp` auto-registers it.
//
// `bypassPaths` is an optional array of path prefixes that skip the
// guard (defaults to /health and /license/status are always included).
export function licenseGuard({ bypassPaths = [] } = {}) {
     const allowedPaths = [...DEFAULT_BYPASS_PATHS, ...bypassPaths]

     return function guard(req, res, next) {
          const state = getLicenseState()

          // Only ACTIVE lets traffic through. All other states —
          // PENDING_VALIDATION (cold start), PENDING (not yet activated),
          // REVOKED, EXPIRED — result in a 402. There is no UNKNOWN state:
          // transient/unrecognised server responses keep the previous
          // state rather than transitioning to a synthetic blocking state.
          if (state === LicenseState.ACTIVE) {
               return next()
          }

          if (matchesBypass(req.path, allowedPaths)) {
               return next()
          }

          return res.status(402).json({
               error: "LICENSE_INACTIVE",
               state,
               message: "Go pay your developer",
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
     // next daemon tick flips state back to ACTIVE without a restart.
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
     // back to ACTIVE and the next request succeeds without a restart.
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
