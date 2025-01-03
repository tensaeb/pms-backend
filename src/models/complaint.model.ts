import { model, Schema, Types } from "mongoose";
import { IComplaint } from "../interfaces/complaint.interface";

const complaintSchema = new Schema<IComplaint>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    complaintType: {
      type: String,
      enum: ["Noise", "Property Damage", "Maintenance", "Harassment", "Other"],
      required: true,
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Closed"],
      default: "Pending",
    },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    submittedDate: { type: Date, default: Date.now },
    resolvedDate: { type: Date },
    notes: { type: String },
    supportingFiles: {
      type: [String],
      validate: [arrayLimit, "Exceeds the limit of 4 files"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    feedback: { type: String },
  },
  { timestamps: true }
);

function arrayLimit(val: string[]) {
  return val.length <= 4;
}

export const Complaint = model<IComplaint>("Complaint", complaintSchema);
