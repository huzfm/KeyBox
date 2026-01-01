import { Schema, model } from "mongoose";
import { LicenseType } from "./License";

export enum Role {
  ADMIN = "ADMIN",
  DEVELOPER = "DEVELOPER",
}

export interface UserType {
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  company_name?: string;
  createdAt: Date;
  licenses?: LicenseType[];
}

const userSchema = new Schema<UserType>({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(Role),
    default: Role.DEVELOPER,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
userSchema.virtual("licenses", {
  ref: "License",
  localField: "_id",
  foreignField: "user",
});
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const User = model<UserType>("User", userSchema);
