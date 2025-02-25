// models/task.model.ts
import { Schema, model, Types } from "mongoose";
import { ITask } from "../interfaces/task.interface";
import { PropertyType } from "../interfaces/property.interface";

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    propertyType: {
      type: String,
      enum: Object.values(PropertyType),
      required: true,
    },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "in progress", "completed", "overdue"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: { type: String },
    completedDate: { type: Date },
    maintenanceRequest: {
      type: Schema.Types.ObjectId,
      ref: "Maintenance",
    },
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", taskSchema);
