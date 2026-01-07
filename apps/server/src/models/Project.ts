import { Schema, model, Types } from "mongoose";

export interface ProjectType {
  name: string;
  client: Types.ObjectId;
  createdAt: Date;
}

const projectSchema = new Schema<ProjectType>({
  name: {
    type: String,
    required: true,
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Project = model<ProjectType>("Project", projectSchema);
