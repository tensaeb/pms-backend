import { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  tenantName: string;
  contactInformation: {
    email: string;
    phoneNumber: string;
    emergencyContact?: string;
  };
  leaseAgreement: {
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    securityDeposit: number;
    specialTerms?: string;
  };
  propertyInformation: {
    unit: string;
    propertyId: Schema.Types.ObjectId;
  };
  password: string;
  idProof: string[];
  paymentMethod: string;
  moveInDate: Date;
  emergencyContacts?: string[];
}
