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
  photosOrVideos?: string[];
  urgencyLevel: "Urgent" | "Routine" | "Non-Urgent";
  preferredAccessTimes?: string;
  status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
  assignedTo?: string;
  priorityLevel?: "Low" | "Medium" | "High";
  estimatedCompletionTime?: Date;
  notes?: string;
}
