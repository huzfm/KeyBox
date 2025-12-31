import { Schema, model } from "mongoose";

export enum Status {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export enum PlanType {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM",
}

const licenseSchema = new Schema({
  key: { type: String, unique: true },
  productName: String,
  customer: String,
  planType: {
    type: String,
    enum: Object.values(PlanType),
    default: PlanType.YEARLY,
  },
  durationDays: { type: Number, default: 365 },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  status: { type: String, enum: Object.values(Status), default: Status.ACTIVE },
  developerId: String,
});

export const License = model("License", licenseSchema);
