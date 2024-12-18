import { Document, Types } from "mongoose";

export interface IMaintenance extends Document {
  user: Types.ObjectId;
  tenant: Types.ObjectId;
  mainteneceUser: Types.ObjectId;
  property: Types.ObjectId;
  typeOfRequest:
    | "Plumbing"
    | "Electrical"
    | "HVAC"
    | "Appliance Repair"
    | "Other";
  description: string;
  urgencyLevel: "Urgent" | "Routine" | "Non-Urgent";
  preferredAccessTimes?: string;
  status?:
    | "Pending"
    | "In Progress"
    | "Completed"
    | "Cancelled"
    | "Inspected"
    | "Incomplete";
  assignedTo?: string;
  priorityLevel?: "Low" | "Medium" | "High";
  estimatedCompletionTime?: Date;
  notes?: string;
  requestedFiles?: string[];
  inpectedFiles?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
