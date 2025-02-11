// models/clearance.model.ts
import { model, Schema } from "mongoose";
import { IClearance } from "../interfaces/clearance.interface";

const clearanceSchema = new Schema<IClearance>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    moveOutDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    reason: { type: String, required: false },
    inspectionStatus: {
      type: String,
      enum: ["Pending", "Passed", "Failed"],
      default: "Pending",
    },
    notes: { type: String },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    inspectionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    inspectionDate: { type: Date },
    feedback: { type: String },
    document: {
      // Added document field
      fileUrl: { type: String },
      documentType: { type: String },
    },
  },
  { timestamps: true }
);

export const Clearance = model<IClearance>("Clearance", clearanceSchema);
