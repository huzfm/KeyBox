import { Schema, model } from "mongoose"
import mongoose from "mongoose"

export enum Status {
     PENDING = "PENDING",
     ACTIVE = "ACTIVE",
     EXPIRED = "EXPIRED",
     REVOKED = "REVOKED",
}
export enum Services {
     HOSTING = "Hosting",
     DOMAIN = "Domain",
}

export interface LicenseType {
     key: string
     duration: number
     issuedAt: Date
     expiresAt: Date
     status: Status
     services: Services[]
     machineId: string
     instanceId: string
     user: mongoose.Types.ObjectId
     client: mongoose.Types.ObjectId
     project: mongoose.Types.ObjectId
}

const licenseSchema = new Schema<LicenseType>({
     key: {
          type: String,
          unique: true,
          required: true,
     },

     duration: {
          type: Number,
          min: 1,
          max: 12,
          required: true,
     },

     issuedAt: {
          type: Date,
          default: Date.now,
     },

     expiresAt: {
          type: Date,
          required: true,
     },

     status: {
          type: String,
          enum: Object.values(Status),
          default: Status.PENDING,
     },
     services: {
          type: [String],
          enum: Object.values(Services),
          validate: [
               (arr: string[]) => arr.length > 0,
               "At least one service is required",
          ],
     },

     user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
     },

     client: {
          type: Schema.Types.ObjectId,
          ref: "Client",
          required: true,
     },

     project: {
          type: Schema.Types.ObjectId,
          ref: "Project",
          required: true,
     },
     machineId: {
          type: String,
          default: null,
          index: true,
     },
     instanceId: {
          type: String,
          default: null,
          index: true,
     },
})

export const License = model<LicenseType>("License", licenseSchema)
