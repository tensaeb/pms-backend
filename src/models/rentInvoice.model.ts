import { Schema, model } from "mongoose";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";

const rentInvoiceSchema = new Schema<IRentInvoice>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    invoiceDate: { type: Date, default: Date.now, required: true },
    rentAmount: { type: Number, required: true },
    additionalCharges: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Late"],
      default: "Pending",
    },
    paymentInstructions: { type: String },
    paymentHistory: [
      {
        paymentDate: { type: Date },
        amountPaid: { type: Number },
        paymentMethod: {
          type: String,
          enum: ["Bank Transfer", "Credit Card", "Cash", "Other"],
        },
        receiptUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const RentInvoice = model<IRentInvoice>(
  "RentInvoice",
  rentInvoiceSchema
);
