import { Schema, model } from "mongoose";
import { LicenseType } from "./License";
import { z } from "zod";

export enum Role {
       ADMIN = "ADMIN",
       DEVELOPER = "DEVELOPER",
}

export interface UserType {
       name: string;
       email: string;
       password_hash?: string;
       googleId?: string;
       profilePicture?: string;
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
              required: false,
              select: false,
       },
       googleId: {
              type: String,
              required: false,
              unique: true,
              sparse: true,
       },
       profilePicture: {
              type: String,
              required: false,
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
