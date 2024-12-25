import { Schema, model } from "mongoose";
import { ITenant } from "../interfaces/tenant.interface";

const tenantSchema = new Schema<ITenant>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    tenantName: { type: String, required: true },
    contactInformation: {
      email: { type: String, required: true, unique: true },
      phoneNumber: { type: String, required: true },
      emergencyContact: { type: String },
    },
    leaseAgreement: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      rentAmount: { type: Number, required: true },
      securityDeposit: { type: Number, required: true },
      specialTerms: { type: String },
    },
    propertyInformation: {
      unit: { type: String, required: true },
      propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    },
    idProof: {
      type: [String],
      validate: [
        (val: string[]) => val.length <= 3,
        "Exceeds the limit of 3 ID proofs",
      ],
    },
    password: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    moveInDate: { type: Date, required: true },
    emergencyContacts: [String],
  },
  { timestamps: true }
);

export const Tenant = model<ITenant>("Tenant", tenantSchema);
