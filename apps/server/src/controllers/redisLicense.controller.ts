import { invalidateCachedLicense } from "../cache/license.cache"
import { Request, Response } from "express"
import { License, Status } from "../models/License"
import { getCachedLicense, setCachedLicense } from "../cache/license.cache"

// Bug 2 fix: the server no longer calls machineIdSync() on the API host.
// The SDK now sends the customer machine's ID in every request body.
// Using the server's own machine ID was meaningless (and broken for replicas).

export const validateLicense = async (req: Request, res: Response) => {
     try {
          // Bug 2 fix: use machineId from the request body (customer's machine).
          const { key, instanceId, machineId: clientMachineId } = req.body

          if (!key) {
               return res.status(400).json({
                    valid: false,
                    message: "License key is required",
               })
          }

          if (!instanceId) {
               return res.status(400).json({
                    valid: false,
                    message: "Instance ID is required",
               })
          }

          // 1. Try Redis cache first
          const cached = await getCachedLicense(key)
          if (cached) {
               console.log("REDIS HIT for license:", key)

               // Machine mismatch — compare against client-supplied ID
               if (
                    cached.status === Status.ACTIVE &&
                    cached.machineId &&
                    clientMachineId &&
                    cached.machineId !== clientMachineId
               ) {
                    return res.json({
                         valid: false,
                         status: "machine_mismatch",
                         message: "License is not valid for this machine",
                    })
               }

               // Instance mismatch
               if (
                    cached.status === Status.ACTIVE &&
                    cached.instanceId &&
                    cached.instanceId !== instanceId
               ) {
                    return res.json({
                         valid: false,
                         status: "instance_mismatch",
                         message: "License is not valid for this instance",
                    })
               }

               // Bug 3 fix: productName validation (skip if license has no productName set)
               if (
                    cached.productName &&
                    req.body.productName &&
                    cached.productName !== req.body.productName
               ) {
                    return res.json({
                         valid: false,
                         status: "invalid",
                         message: "License key is not valid for this product",
                    })
               }

               if (cached.status !== Status.ACTIVE) {
                    return res.json({
                         valid: false,
                         status: cached.status.toLowerCase(),
                         message: cached.message,
                         expiresAt: cached.expiresAt,
                    })
               }

               if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
                    const license = await License.findOneAndUpdate(
                         { key },
                         { status: Status.EXPIRED },
                         { new: true },
                    )

                    await invalidateCachedLicense(key)

                    if (license) {
                         await setCachedLicense(key, {
                              status: Status.EXPIRED,
                              expiresAt: license.expiresAt.getTime(),
                              message: "License has expired",
                              machineId: license.machineId,
                              instanceId: license.instanceId,
                              productName: license.productName,
                         })
                    }

                    return res.json({
                         valid: false,
                         status: "expired",
                         message: "License has expired",
                         expiresAt: cached.expiresAt,
                    })
               }

               return res.json({
                    valid: true,
                    status: "active",
                    duration: cached.duration,
                    expiresAt: cached.expiresAt,
               })
          }

          // 2. MongoDB fallback
          console.log("MONGO HIT for license:", key)

          const license = await License.findOne({ key })

          if (!license) {
               return res.json({
                    valid: false,
                    status: "invalid",
                    message: "Key does not exist",
               })
          }

          // Bug 2 fix: use client-supplied machineId for comparison
          if (
               license.status === Status.ACTIVE &&
               license.machineId &&
               clientMachineId &&
               license.machineId !== clientMachineId
          ) {
               return res.json({
                    valid: false,
                    status: "machine_mismatch",
                    message: "License is not valid for this machine",
               })
          }

          if (
               license.status === Status.ACTIVE &&
               license.instanceId &&
               license.instanceId !== instanceId
          ) {
               return res.json({
                    valid: false,
                    status: "instance_mismatch",
                    message: "License is not valid for this instance",
               })
          }

          // Bug 3 fix: productName guard (only when both sides have a value)
          if (
               license.productName &&
               req.body.productName &&
               license.productName !== req.body.productName
          ) {
               return res.json({
                    valid: false,
                    status: "invalid",
                    message: "License key is not valid for this product",
               })
          }

          if (license.status === Status.REVOKED) {
               await setCachedLicense(key, {
                    status: Status.REVOKED,
                    message: "License revoked by developer",
                    machineId: license.machineId,
                    instanceId: license.instanceId,
                    productName: license.productName,
               })

               return res.json({
                    valid: false,
                    status: "revoked",
                    message: "License revoked by developer",
               })
          }

          if (license.status === Status.PENDING) {
               await setCachedLicense(key, {
                    status: Status.PENDING,
                    message: "License has not been activated yet",
               })

               return res.json({
                    valid: false,
                    status: "pending",
                    message: "License has not been activated yet",
               })
          }

          if (license.status === Status.EXPIRED) {
               await setCachedLicense(key, {
                    status: Status.EXPIRED,
                    message: "License has expired",
                    expiresAt: license.expiresAt.getTime(),
                    machineId: license.machineId,
                    instanceId: license.instanceId,
                    productName: license.productName,
               })

               return res.json({
                    valid: false,
                    status: "expired",
                    message: "License has expired",
                    expiresAt: license.expiresAt.getTime(),
               })
          }

          if (license.status === Status.ACTIVE) {
               const now = new Date()

               if (now > license.expiresAt) {
                    license.status = Status.EXPIRED
                    await license.save()

                    return res.json({
                         valid: false,
                         status: "expired",
                         message: "License has expired",
                         expiresAt: license.expiresAt,
                    })
               }

               await setCachedLicense(key, {
                    status: Status.ACTIVE,
                    expiresAt: license.expiresAt.getTime(),
                    duration: `${license.duration} months`,
                    machineId: license.machineId,
                    instanceId: license.instanceId,
                    productName: license.productName,
               })

               return res.json({
                    valid: true,
                    status: "active",
                    duration: `${license.duration} months`,
                    expiresAt: license.expiresAt.getTime(),
               })
          }

          return res.json({
               valid: false,
               status: "unknown",
               message: "Unknown license status",
          })
     } catch (error) {
          return res.status(500).json({
               valid: null,
               status: "server_error",
               message: "Internal validation error",
               error: (error as Error).message,
          })
     }
}

export const activateLicense = async (req: Request, res: Response) => {
     try {
          // Bug 2 fix: use machineId sent by the SDK (customer's machine),
          // not machineIdSync() which would return the API server's machine ID.
          const { key, instanceId, machineId: clientMachineId, productName } = req.body

          if (!key) {
               return res.status(400).json({
                    success: false,
                    message: "License key is required",
               })
          }

          if (!instanceId) {
               return res.status(400).json({
                    success: false,
                    message: "Instance ID is required",
               })
          }

          if (!clientMachineId) {
               return res.status(400).json({
                    success: false,
                    message: "Machine ID is required",
               })
          }

          // Bug 9 fix: atomic pending→active transition.
          // findOneAndUpdate with { key, status: PENDING } ensures only one
          // concurrent activation request wins — the second gets null back and
          // falls through to the "already activated" branch below.
          const issuedAt = new Date()
          const tempExpiresAt = new Date() // placeholder, replaced after lookup

          // First, look up the license to validate it before atomically activating.
          const existing = await License.findOne({ key })

          if (!existing) {
               return res.status(404).json({
                    success: false,
                    message: "License not found",
               })
          }

          if (existing.status === Status.REVOKED) {
               return res.status(403).json({
                    success: false,
                    message: "License has been revoked",
               })
          }

          if (existing.status === Status.EXPIRED) {
               return res.status(403).json({
                    success: false,
                    message: "License has expired",
               })
          }

          // Bug 3 fix: if the license was created with a productName, it must match.
          if (existing.productName && productName && existing.productName !== productName) {
               return res.status(403).json({
                    success: false,
                    message: "License key is not valid for this product",
               })
          }

          // Already activated — allow re-activation only if same machine + instance.
          if (existing.status === Status.ACTIVE) {
               if (existing.machineId !== clientMachineId) {
                    return res.status(403).json({
                         success: false,
                         message: "License already activated on another machine",
                    })
               }

               if (existing.instanceId !== instanceId) {
                    return res.status(403).json({
                         success: false,
                         message: "License already activated on another instance",
                    })
               }

               return res.json({
                    success: true,
                    message: "License already activated",
                    activatedAt: existing.issuedAt,
                    expiresAt: existing.expiresAt,
               })
          }

          // Bug 9 fix: use atomic conditional update so two concurrent first-activation
          // requests for the same PENDING key cannot both succeed with different UUIDs.
          const activatedAt = new Date()
          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + existing.duration)

          const license = await License.findOneAndUpdate(
               { key, status: Status.PENDING }, // only matches if still PENDING
               {
                    $set: {
                         status: Status.ACTIVE,
                         issuedAt: activatedAt,
                         expiresAt,
                         machineId: clientMachineId,
                         instanceId,
                         // Bug 3: store productName on first activation if provided
                         ...(productName ? { productName } : {}),
                    },
               },
               { new: true },
          )

          if (!license) {
               // Race condition: another process activated the key between our
               // findOne check and the findOneAndUpdate. Fetch the current state.
               const winner = await License.findOne({ key })
               if (winner?.status === Status.ACTIVE) {
                    if (winner.machineId !== clientMachineId || winner.instanceId !== instanceId) {
                         return res.status(403).json({
                              success: false,
                              message: "License already activated on another instance",
                         })
                    }
                    // Same credentials won — idempotent success.
                    return res.json({
                         success: true,
                         message: "License already activated",
                         activatedAt: winner.issuedAt,
                         expiresAt: winner.expiresAt,
                    })
               }

               return res.status(409).json({
                    success: false,
                    message: "Activation conflict — please retry",
               })
          }

          await invalidateCachedLicense(key)

          return res.json({
               success: true,
               message: "License activated successfully",
               machineId: clientMachineId,
               instanceId,
               activatedAt,
               expiresAt,
          })
     } catch (error) {
          return res.status(500).json({
               success: false,
               message: "Activation failed",
               error: (error as Error).message,
          })
     }
}
