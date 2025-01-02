import { Document, Types } from "mongoose";

export interface IClearance extends Document {
  tenant: Types.ObjectId;
  property: Types.ObjectId;
  moveOutDate: Date;
  status: string;
  inspectionStatus: string;
  notes?: string;
  approvedBy?: Types.ObjectId;
  inspectionBy?: Types.ObjectId;
  inspectionDate?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}
