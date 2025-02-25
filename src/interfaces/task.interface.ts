// interfaces/task.interface.ts
import { Types } from "mongoose";
import { PropertyType } from "./property.interface";

export interface ITask {
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
  assignedTo: Types.ObjectId;
  propertyType?: PropertyType;
  dueDate: Date;
  status: "pending" | "in progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  notes?: string;
  completedDate?: Date;
  maintenanceRequest?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  _id?: Types.ObjectId;
}
