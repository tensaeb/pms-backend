import { Document, Schema, Types } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";
import { IUser } from "./user.interface";

export interface ILease extends Document {
  user: Types.ObjectId | IUser | string;
  tenant: Types.ObjectId | ITenant | string;
  property: Types.ObjectId | IProperty | string;
  leaseStart: Date;
  leaseEnd: Date;
  rentAmount: number;
  securityDeposit: number;
  paymentTerms: {
    dueDate: string;
    paymentMethod: string;
  };
  rulesAndConditions?: string;
  additionalOccupants?: string[];
  utilitiesAndServices?: string;
  documents?: string[];
  status: "active" | "expired" | "pending" | "terminated";
  createdAt?: Date;
  updatedAt?: Date;
}
