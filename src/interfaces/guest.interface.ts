import { Document, Types } from "mongoose";

export interface IGuest extends Document {
  user: Types.ObjectId;
  property: Types.ObjectId;
  name: string;
  email: string;
  phoneNumber: string;
  arrivalDate: Date;
  departureDate: Date;
  reason: string;
  qrCode?: string;
  accessCode?: string;
  notes?: string;
  status: "pending" | "active" | "expired" | "cancelled";
}
