// src/models/branch.model.ts
import { Schema, model, Types } from "mongoose";
import { IBranch } from "../interfaces/branch.interface";

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    address: { type: String },
    contactPerson: { type: String },
    admin: { type: Schema.Types.ObjectId, ref: "User" }, // Reference to the admin user
  },
  { timestamps: true }
);

export const Branch = model<IBranch>("Branch", branchSchema);
