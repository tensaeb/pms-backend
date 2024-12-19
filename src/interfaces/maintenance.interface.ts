import { Document, Types } from "mongoose";

export interface IMaintenance extends Document {
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

  approvalStatus?: "Pending" | "Approved" | "Rejected";
  assignedMaintainer: Types.ObjectId;
  scheduledDate: Date;
  assignedTo?: string;
  expense: number;
  inspectedBy: Types.ObjectId;
  inspectionDate?: Date;
  priorityLevel?: "Low" | "Medium" | "High";
  estimatedCompletionTime?: Date;
  notes?: string;
  requestedFiles?: string[];
  inspectedFiles?: string[];
  feedback: string;
  requestDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
