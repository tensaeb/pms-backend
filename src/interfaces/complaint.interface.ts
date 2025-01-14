import { Document, Schema, Types } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";
import { IUser } from "./user.interface";

export interface IComplaint extends Document {
  createdBy: Types.ObjectId | IUser;
  tenant?: Types.ObjectId | ITenant;
  property: Types.ObjectId | IProperty;
  complaintType:
    | "Noise"
    | "Property Damage"
    | "Maintenance"
    | "Harassment"
    | "Other";
  description: string;
  status?: "Pending" | "In Progress" | "Resolved" | "Closed"; // Defaults to "Pending"
  priority?: "Low" | "Medium" | "High"; // Defaults to "Low"
  submittedDate?: Date; // Defaults to the current date
  resolvedDate?: Date;
  notes?: string;
  supportingFiles?: string[]; // Max 4 files
  assignedTo?: Types.ObjectId; // Reference to the User
  feedback?: string;
  createdAt?: Date; // Automatically added by Mongoose timestamps
  updatedAt?: Date; // Automatically added by Mongoose timestamps
}
