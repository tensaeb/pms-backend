import { Document, Schema } from "mongoose";
import { ITenant } from "./tenant.interface";
import { IProperty } from "./property.interface";

export interface IRentInvoice extends Document {
  tenant: Schema.Types.ObjectId | ITenant;
  property: Schema.Types.ObjectId | IProperty;
  invoiceDate: Date;
  rentAmount: number;
  additionalCharges: number;
  totalAmount: number;
  dueDate: Date;
  paymentStatus: "Pending" | "Paid" | "Late";
  paymentInstructions?: string;
  paymentHistory: {
    paymentDate: Date;
    amountPaid: number;
    paymentMethod: "Bank Transfer" | "Credit Card" | "Cash" | "Other";
    receiptUrl?: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}
