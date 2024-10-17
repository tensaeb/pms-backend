import { Document, Types } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";

export interface ILease extends Document {
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
