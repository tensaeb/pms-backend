import { Document, Schema } from "mongoose";

export interface IRentInvoice extends Document {
  tenant: Schema.Types.ObjectId;
  property: Schema.Types.ObjectId;
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
}
