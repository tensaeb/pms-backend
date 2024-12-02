import { Document, Schema, Types } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";
import { IUser } from "./user.interface";

export interface ILease extends Document {
  user: Types.ObjectId | IUser;
  tenant: Types.ObjectId | ITenant;
  property: Types.ObjectId | IProperty;
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
  createdAt?: Date;
  updatedAt?: Date;
}
