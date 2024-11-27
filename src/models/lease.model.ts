import { model, Schema } from "mongoose";
import { ILease } from "../interfaces/lease.interface";

const leaseSchema = new Schema<ILease>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: true },
    rentAmount: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    paymentTerms: {
      dueDate: { type: String, required: true },
      paymentMethod: { type: String, required: true },
    },
    rulesAndConditions: { type: String },
    additionalOccupants: { type: [String] },
    utilitiesAndServices: { type: String },
    documents: { type: [String] },
  },
  { timestamps: true }
);

export const Lease = model<ILease>("Lease", leaseSchema);
