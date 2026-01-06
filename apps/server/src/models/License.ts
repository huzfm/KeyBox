import { Schema, model } from "mongoose";
import mongoose from "mongoose";

export enum Status {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export interface LicenseType {
  key: string;
  productName: string;
  customer: string;
  duration: number;
  issuedAt: Date;
  expiresAt: Date;
  status: Status;
  user: mongoose.Schema.Types.ObjectId;
}

const licenseSchema = new Schema<LicenseType>({
  key: {
    type: String,
    unique: true,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  customer: {
    type: String,
    required: [true, "Customer name is required"],
  },

  duration: {
    type: Number,
    min: 1,
    max: 12,
    required: [true, "Duration is required (1-12 months)"],
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export const License = model<LicenseType>("License", licenseSchema);
