import { Document, Types } from "mongoose";

export interface IPayment extends Document {
  tenant: Types.ObjectId;
  invoice: Types.ObjectId;
  paymentDate: Date;
  amountPaid: number;
  paymentMethod: string;
  receiptUrl?: string;
}
