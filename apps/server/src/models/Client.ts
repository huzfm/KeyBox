import { Schema, model, Types } from "mongoose";

export interface ClientType {
  name: string;
  owner: Types.ObjectId;
  createdAt: Date;
}

const clientSchema = new Schema<ClientType>({
  name: {
    type: String,
    required: true,
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
