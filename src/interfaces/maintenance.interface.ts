import { Document, Types } from "mongoose";

interface IEquipmentCost {
  quantity: number;
  pricePerUnit: number;
  total: number;
}

interface IExpense {
  laborCost?: number;
  equipmentCost?: IEquipmentCost[];
  description?: string;
}

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
  assignedMaintainer?: Types.ObjectId[];
  scheduledDate?: Date;
  priorityLevel?: "Low" | "Medium" | "High";
  estimatedCompletionTime?: Date;
  notes?: string;
  expense?: IExpense;
  inspectedBy?: Types.ObjectId;
  inspectionDate?: Date;
  requestedFiles?: string[];
  inspectedFiles?: string[];
  feedback?: string;
  requestDate?: Date;
  originalPropertyStatus?:
    | "open"
    | "reserved"
    | "closed"
    | "under maintenance"
    | "sold";
  totalExpenses?: number; // New field

  createdAt?: Date;
  updatedAt?: Date;
}
