// interfaces/task.interface.ts
import { Types } from "mongoose";

export interface ITask {
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
  assignedTo: Types.ObjectId;
  property?: Types.ObjectId;
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
