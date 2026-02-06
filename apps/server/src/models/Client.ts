import { Schema, model, Types } from "mongoose";

export interface ClientType {
       name: string;
       email: string;
       owner: Types.ObjectId;
       createdAt: Date;
}

const clientSchema = new Schema<ClientType>({
       name: {
              type: String,
              required: true,
       },
       email: {
              type: String,
              required: true,
              lowercase: true,
              trim: true,
              match: [
                     /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                     "Please enter a valid email address",
              ],
       },
       owner: {
              type: Schema.Types.ObjectId,
              ref: "User",
              required: true,
       },
       createdAt: {
              type: Date,
              default: Date.now,
       },
});

export const Client = model<ClientType>("Client", clientSchema);
