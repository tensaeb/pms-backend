import { model, Schema } from "mongoose";
import { IPayment } from "../interfaces/payment.interface";

const paymentSchema = new Schema<IPayment>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    amountPaid: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>("Payment", paymentSchema);
