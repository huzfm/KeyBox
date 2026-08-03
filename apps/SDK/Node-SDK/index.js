import fetch from "node-fetch"
import { randomUUID } from "crypto"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

// ── Module-level daemon state ─────────────────────────────────────────────────
let intervalId = null
let lastState = "pending_validation"
let isValidating = false // Bug 6: overlap guard
let lastSuccessfulValidation = null // Bug 8: offline grace tracking

// ── License State ─────────────────────────────────────────────────────────────
export const LicenseState = Object.freeze({
     PENDING: "PENDING",
     ACTIVE: "ACTIVE",
     EXPIRED: "EXPIRED",
     REVOKED: "REVOKED",
     PENDING_VALIDATION: "pending_validation",
})

// Bug 1 fix: server statuses that must map to REVOKED (fail-closed).
// Previously these fell into the "unrecognised → keep state" branch,
// leaving an already-ACTIVE app permanently unlocked.
const HARD_REVOKE_STATUSES = new Set([
     "invalid",
     "machine_mismatch",
     "instance_mismatch",
     "unknown",
])

const INACTIVE_STATES = new Set([
     LicenseState.EXPIRED,
     LicenseState.REVOKED,
     LicenseState.PENDING,
])

const DEFAULT_BYPASS_PATHS = ["/health", "/license/status"]

// ── Fetch with timeout ────────────────────────────────────────────────────────
// Bug 6 fix: every outgoing request has a hard deadline so a slow or
// absent license server can never hang the daemon indefinitely.
const DEFAULT_FETCH_TIMEOUT_MS = 10_000

function fetchWithTimeout(url, options, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
     const controller = new AbortController()
     const timer = setTimeout(() => controller.abort(), timeoutMs)
     return fetch(url, { ...options, signal: controller.signal }).finally(() =>
          clearTimeout(timer),
     )
}

// ── Bypass path matching ──────────────────────────────────────────────────────
function matchesBypass(pathname, bypassPaths) {
     if (!pathname) return false
     for (const pattern of bypassPaths) {
          if (pattern === pathname) return true
          if (pattern.endsWith("/") && pathname.startsWith(pattern)) return true
          if (!pattern.endsWith("/") && pathname.startsWith(pattern + "/"))
               return true
     }
     return false
}

// ── Logging ───────────────────────────────────────────────────────────────────
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

// ── Error Classes ─────────────────────────────────────────────────────────────
export class LicenseAlreadyActivatedError extends Error {
     constructor(message) {
          super(message)
          this.name = "LicenseAlreadyActivatedError"
          this.code = "LICENSE_ALREADY_ACTIVATED"
     }
}

// ── Instance ID storage ───────────────────────────────────────────────────────
function readStoredInstanceId() {
     const filePath = join(process.cwd(), ".instance-id")
     try {
          return readFileSync(filePath, "utf8").trim() || null
     } catch {
          return null
     }
}

function persistInstanceId(id) {
     const filePath = join(process.cwd(), ".instance-id")
     try {
          writeFileSync(filePath, id, { encoding: "utf8", flag: "wx" })
     } catch (err) {
          if (err && err.code === "EEXIST") return
          const existing = readStoredInstanceId()
          if (existing !== id) {
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

function getCandidateInstanceId() {
     return readStoredInstanceId() || randomUUID()
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getLicenseState() {
     return lastState
}

// Bug 12 fix: setLicenseState is no longer exported.
// Exporting it let anyone bypass enforcement with a single import:
//   setLicenseState(LicenseState.ACTIVE)
// State is now only mutated by the daemon's validated server responses.
function setLicenseState(state) {
     const allowed = Object.values(LicenseState)
     if (!allowed.includes(state)) {
          log("WARN", "Ignoring invalid license state", { state, allowed })
          return
     }
     lastState = state
}

export async function checkLicenseStatus({
     productName,
     key,
     apiUrl = "https://api-keybox.vercel.app",
     endpoint = "/validate",
     fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     const instanceId = readStoredInstanceId()

     if (!instanceId) {
          return { status: "not_activated", active: false, data: null }
     }

     log("INFO", "Checking license status", { productName })

     const res = await fetchWithTimeout(
          `${apiUrl}${endpoint}`,
          {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ key, productName, instanceId }),
          },
          fetchTimeoutMs,
     )

     const data = await res.json().catch(() => null)
     const rawStatus =
          data && typeof data.status === "string" ? data.status : ""
     const statusUpper = rawStatus.toUpperCase()
     const isActive = data?.valid === true && statusUpper === "ACTIVE"

     return { status: statusUpper, active: isActive, data }
}

export async function activateLicense({
     productName,
     key,
     apiUrl = "https://api-keybox.vercel.app",
     endpoint = "/validate/activate",
     fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     const instanceId = getCandidateInstanceId()

     log("INFO", "Activating license", { productName })

     const res = await fetchWithTimeout(
          `${apiUrl}${endpoint}`,
          {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ key, productName, instanceId }),
          },
          fetchTimeoutMs,
     )

     const data = await res.json().catch(() => {
          throw new Error("License server did not return JSON")
     })

     // Bug 7 fix: require success === true.
     // Previously data?.success === false meant HTTP 200 with {} was accepted
     // as a successful activation (missing field ≠ false).
     if (!res.ok || data?.success !== true) {
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

     if (!readStoredInstanceId()) {
          persistInstanceId(instanceId)
     }

     log("SUCCESS", "License activated")
     return data
}

// Production default: 15 minutes. Keeps well within the server's
// 3000-requests-per-15-min rate limit even across many instances.
const DEFAULT_INTERVAL = 900 // seconds

export async function startLicenseDaemon({
     productName,
     key,
     apiUrl = "https://api-keybox.vercel.app",
     endpoint = "/validate",
     onRevoke,
     onRecover,
     intervalSeconds = DEFAULT_INTERVAL,
     fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
     offlineGraceSeconds,
}) {
     if (!productName || !key) {
          throw new Error("productName and key are required")
     }

     // Bug 8: offline grace defaults to 2× interval, minimum 30 minutes.
     const offlineGraceMs =
          (offlineGraceSeconds ?? Math.max(intervalSeconds * 2, 1800)) * 1000

     // Helper: fire a callback without letting it crash the daemon.
     // Bug 10 fix: async callbacks are wrapped so unhandled rejections
     // never reach the process-level unhandledRejection handler.
     function fireCallback(cb, data) {
          if (!cb) return
          Promise.resolve(cb(data)).catch((err) =>
               log("WARN", "License callback threw", { error: err.message }),
          )
     }

     async function validateOnce() {
          // Bug 6 fix: skip this tick entirely if the previous one is still
          // in-flight. Prevents overlapping fetches from arriving out of order
          // and overwriting a newer license state with a stale one.
          if (isValidating) {
               log(
                    "INFO",
                    "Skipping validation tick — previous check still in progress",
               )
               return
          }
          isValidating = true

          try {
               // Bug 4 fix: re-read the instance ID on every tick.
               // The original code captured it once at daemon startup, so a
               // failed activation on cold start left it permanently null with
               // no retry path — the daemon just silently skipped every tick.
               let instanceId = readStoredInstanceId()

               if (!instanceId) {
                    if (lastState === LicenseState.PENDING_VALIDATION) {
                         log(
                              "WARN",
                              "No .instance-id on disk — retrying activation",
                         )
                         try {
                              await activateLicense({
                                   productName,
                                   key,
                                   apiUrl,
                                   fetchTimeoutMs,
                              })
                              instanceId = readStoredInstanceId()
                         } catch (activationErr) {
                              log("WARN", "Activation retry failed", {
                                   error: activationErr.message,
                              })
                         }
                    }
                    if (!instanceId) {
                         log(
                              "WARN",
                              "No .instance-id on disk — skipping validation",
                         )
                         return
                    }
               }

               log("INFO", "Validating license", { productName })

               // Bug 6 fix: hard fetch deadline.
               const res = await fetchWithTimeout(
                    `${apiUrl}${endpoint}`,
                    {
                         method: "POST",
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({ key, productName, instanceId }),
                    },
                    fetchTimeoutMs,
               )

               // 429 and 5xx are transient — keep current state without blocking.
               if (res.status === 429 || res.status >= 500) {
                    log(
                         "WARN",
                         "Transient server response — keeping current state",
                         {
                              httpStatus: res.status,
                              currentState: lastState,
                         },
                    )
                    return
               }

               const data = await res.json().catch(() => {
                    throw new Error("Non-JSON response from license server")
               })

               const rawStatus =
                    data && typeof data.status === "string" ? data.status : ""
               const statusUpper = rawStatus.toUpperCase()

               // Bug 1 fix: map hard-fail server statuses to REVOKED.
               // Previously invalid/machine_mismatch/instance_mismatch fell into
               // the "unrecognised → keep state" branch, leaving an ACTIVE app
               // permanently unlocked after the server denied the license.
               let nextState
               if (HARD_REVOKE_STATUSES.has(rawStatus.toLowerCase())) {
                    nextState = LicenseState.REVOKED
                    log(
                         "WARN",
                         "License validation returned hard-fail status — revoking",
                         {
                              serverStatus: rawStatus,
                         },
                    )
               } else if (data.valid === true && statusUpper === "ACTIVE") {
                    nextState = LicenseState.ACTIVE
                    lastSuccessfulValidation = Date.now() // Bug 8: update grace timestamp
               } else if (statusUpper === "REVOKED") {
                    nextState = LicenseState.REVOKED
               } else if (statusUpper === "EXPIRED") {
                    nextState = LicenseState.EXPIRED
               } else if (statusUpper === "PENDING") {
                    nextState = LicenseState.PENDING
               } else {
                    // Truly unrecognised payload — keep previous state (transient).
                    log(
                         "WARN",
                         "Unrecognised license server response — keeping current state",
                         {
                              currentState: lastState,
                              serverStatus: rawStatus,
                              serverValid: data?.valid,
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

                    if (
                         INACTIVE_STATES.has(nextState) &&
                         !INACTIVE_STATES.has(previousState)
                    ) {
                         fireCallback(onRevoke, data)
                    } else if (
                         nextState === LicenseState.ACTIVE &&
                         INACTIVE_STATES.has(previousState)
                    ) {
                         fireCallback(onRecover, data)
                    }
               }
          } catch (err) {
               log("WARN", "License check failed — keeping current state", {
                    error: err.message,
               })

               if (lastState === LicenseState.PENDING_VALIDATION) {
                    // Cold-start network failure: block immediately.
                    lastState = LicenseState.REVOKED
                    log(
                         "ERROR",
                         "License daemon could not reach the server on startup — requests will be rejected with 402",
                         {
                              from: LicenseState.PENDING_VALIDATION,
                              to: LicenseState.REVOKED,
                         },
                    )
                    // Bug 10 fix: fire onRevoke for cold-start failures too.
                    fireCallback(onRevoke, null)
               } else if (
                    lastState === LicenseState.ACTIVE &&
                    lastSuccessfulValidation !== null
               ) {
                    // Bug 8 fix: bounded offline grace period.
                    // Before this fix, a network failure after reaching ACTIVE
                    // kept the app unlocked indefinitely.
                    const elapsed = Date.now() - lastSuccessfulValidation
                    if (elapsed > offlineGraceMs) {
                         log(
                              "ERROR",
                              "Offline grace period exceeded — blocking requests",
                              {
                                   graceMinutes: Math.round(
                                        offlineGraceMs / 60_000,
                                   ),
                                   elapsedMinutes: Math.round(elapsed / 60_000),
                              },
                         )
                         lastState = LicenseState.REVOKED
                         fireCallback(onRevoke, null)
                    } else {
                         log(
                              "WARN",
                              "Network failure — within offline grace period",
                              {
                                   elapsedMinutes: Math.round(elapsed / 60_000),
                                   graceMinutes: Math.round(
                                        offlineGraceMs / 60_000,
                                   ),
                              },
                         )
                    }
               }
          } finally {
               // Bug 6: always release the overlap guard, even on throw.
               isValidating = false
          }
     }

     await validateOnce()

     intervalId = setInterval(validateOnce, intervalSeconds * 1000)

     log("INFO", "License daemon started", { intervalSeconds })
}

export function stopLicenseDaemon() {
     if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
     }
     log("INFO", "License daemon stopped")
}

export function licenseGuard({ bypassPaths = [] } = {}) {
     const allowedPaths = [...DEFAULT_BYPASS_PATHS, ...bypassPaths]

     return function guard(req, res, next) {
          const state = getLicenseState()

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
     onRevoke,
     onRecover,
     intervalSeconds,
     fetchTimeoutMs,
     offlineGraceSeconds,
}) {
     if (!app) throw new Error("Express app instance is required")
     if (port === undefined || port === null)
          throw new Error("port is required")

     const guard = licenseGuard({ bypassPaths })
     app.use(guard)
     promoteMiddlewareToFront(app, guard)

     try {
          const status = await checkLicenseStatus({
               productName,
               key,
               apiUrl,
               fetchTimeoutMs,
          })
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
               await activateLicense({
                    productName,
                    key,
                    apiUrl,
                    fetchTimeoutMs,
               })
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
     }

     app.listen(port, () => {
          log("INFO", `Licensed app running at http://localhost:${port}`)
     })

     await startLicenseDaemon({
          productName,
          key,
          apiUrl,
          onRevoke,
          onRecover,
          intervalSeconds,
          fetchTimeoutMs,
          offlineGraceSeconds,
     })
}

// ── Express middleware stack manipulation ─────────────────────────────────────
// Splices the license guard to run immediately after Express's own built-in
// middleware (query + init) so it covers all customer-registered routes.
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

          let idx = -1
          for (let i = 0; i < stack.length; i++) {
               if (stack[i].handle === middlewareFn) {
                    idx = i
                    break
               }
          }
          if (idx < 0) return

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
          const insertAt = Math.min(target, stack.length)
          stack.splice(insertAt, 0, layer)

          log(
               "INFO",
               "Promoted license guard to run after Express built-in middlewares",
               {
                    from: idx,
                    to: insertAt,
                    totalLayers: stack.length,
               },
          )
     } catch (err) {
          log("WARN", "Failed to promote license guard", { error: err.message })
     }
}
