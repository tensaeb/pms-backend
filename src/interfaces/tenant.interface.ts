import { Document, Schema, Types } from "mongoose";
import { IUser } from "./user.interface";

export interface ITenant extends Document {
  user: Types.ObjectId | IUser;
  registeredBy: Types.ObjectId | IUser;
  registeredByAdmin: Types.ObjectId | IUser;
  tenantName: string;
  contactInformation: {
    email: string;
    phoneNumber: string;
    emergencyContact?: string;
  };
  status: "active" | "inactive" | "pending";
  leaseAgreement: {
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    securityDeposit: number;
    specialTerms?: string;
  };
  propertyInformation: {
    unit?: string;
    propertyId: Schema.Types.ObjectId;
  };
  password: string;
  idProof: string[];
  paymentMethod: string;
  moveInDate: Date;
  emergencyContacts?: string[];
}
