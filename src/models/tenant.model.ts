import { Schema, model } from "mongoose";
import { ITenant } from "../interfaces/tenant.interface";

const tenantSchema = new Schema<ITenant>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    registeredByAdmin: { type: Schema.Types.ObjectId, ref: "User" },
    lease: { type: Schema.Types.ObjectId, ref: "Lease" },
    tenantName: { type: String, required: true },
    contactInformation: {
      email: { type: String, required: true, unique: true },
      phoneNumber: { type: String, required: true },
      emergencyContact: { type: String },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    propertyInformation: {
      unit: { type: String },
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
    paymentMethod: { type: String },
    moveInDate: { type: Date },
    emergencyContacts: [String],
  },
  { timestamps: true }
);

export const Tenant = model<ITenant>("Tenant", tenantSchema);
