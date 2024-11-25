import { model, Schema } from "mongoose";
import { IMaintenance } from "../interfaces/maintenance.interface";

const maintenanceSchema = new Schema<IMaintenance>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    typeOfRequest: {
      type: String,
      enum: ["Plumbing", "Electrical", "HVAC", "Appliance Repair", "Other"],
      required: true,
    },
    description: { type: String, required: true },
    photosOrVideos: {
      type: [String],
      validate: [arrayLimit, "Exceeds the limit of 4 files"],
    },
    urgencyLevel: {
      type: String,
      enum: ["Urgent", "Routine", "Non-Urgent"],
      required: true,
    },
    preferredAccessTimes: { type: String },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    assignedTo: { type: String },
    priorityLevel: { type: String, enum: ["Low", "Medium", "High"] },
    estimatedCompletionTime: { type: Date },
    notes: { type: String },
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
