import { Document, Types } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";

export interface IClearance extends Document {
  tenant: Types.ObjectId | ITenant;
  property: Types.ObjectId | IProperty;
  moveOutDate: Date;
  status: string;
  reason: string;
  inspectionStatus: string;
  document?: {
    // Added document field
    fileUrl: string;
    documentType: string;
  };
  notes?: string;
  approvedBy?: Types.ObjectId;
  inspectionBy?: Types.ObjectId;
  inspectionDate?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}
