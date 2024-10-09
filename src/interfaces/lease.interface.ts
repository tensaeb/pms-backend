import { Document, Types } from "mongoose";

export interface ILease extends Document {
  tenant: Types.ObjectId;
  property: Types.ObjectId;
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
}
