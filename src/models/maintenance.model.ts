import { model, Schema } from "mongoose";
import { IMaintenance } from "../interfaces/maintenance.interface";

const equipmentCostSchema = new Schema({
  quantity: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  description: { type: String, default: "" },
});

const expenseSchema = new Schema({
  laborCost: { type: Number, default: 0 },
  equipmentCost: [equipmentCostSchema],
});

const maintenanceSchema = new Schema<IMaintenance>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    typeOfRequest: {
      type: String,
      enum: ["Plumbing", "Electrical", "HVAC", "Appliance Repair", "Other"],
      required: true,
    },
    description: { type: String, required: true },
    urgencyLevel: {
      type: String,
      enum: ["Urgent", "Routine", "Non-Urgent"],
      required: true,
    },
    preferredAccessTimes: { type: String },
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "In Progress",
        "Completed",
        "Cancelled",
        "Inspected",
        "Incomplete",
      ],
      default: "Pending",
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    assignedMaintainer: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    scheduledDate: { type: Date },
    priorityLevel: { type: String, enum: ["Low", "Medium", "High"] },
    estimatedCompletionTime: { type: Date },
    notes: { type: String },
    expense: expenseSchema,
    inspectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    inspectionDate: { type: Date },
    requestedFiles: {
      type: [String],
      validate: [arrayLimit, "Exceeds the limit of 4 files"],
    },
    inspectedFiles: {
      type: [String],
      validate: [arrayLimit, "Exceeds the limit of 4 files"],
    },
    feedback: { type: String },
    requestDate: { type: Date, default: Date.now },
    totalExpenses: { type: Number }, // New field
  },
  { timestamps: true }
);

function arrayLimit(val: string[]) {
  return val.length <= 4;
}

export const Maintenance = model<IMaintenance>(
  "Maintenance",
  maintenanceSchema
);
