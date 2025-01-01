// maintenance.interface.ts

import { Document, Types } from "mongoose";

export interface IMaintenance extends Document {
  tenant: Types.ObjectId;
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
  status:
    | "Pending"
    | "Approved"
    | "In Progress"
    | "Completed"
    | "Cancelled"
    | "Inspected"
    | "Incomplete";
  approvalStatus: "Pending" | "Approved" | "Rejected";
  assignedMaintainer?: Types.ObjectId;
  scheduledDate?: Date;
  priorityLevel?: "Low" | "Medium" | "High";
  estimatedCompletionTime?: Date;
  notes?: string;
  expense?: number;
  inspectedBy?: Types.ObjectId;
  inspectionDate?: Date;
  requestedFiles?: string[];
  inspectedFiles?: string[];
  feedback?: string;
  requestDate?: Date; //Added request Date
  originalPropertyStatus?:
    | "open"
    | "reserved"
    | "closed"
    | "under maintenance"
    | "sold";

  createdAt?: Date;
  updatedAt?: Date;
}
