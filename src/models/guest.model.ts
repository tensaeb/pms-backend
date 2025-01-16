// guest.model.ts
import { Schema, model, Types } from "mongoose";
import { IGuest } from "../interfaces/guest.interface";

const guestSchema = new Schema<IGuest>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    name: { type: String, required: true },
    email: { type: String },
    phoneNumber: { type: String, required: true },
    arrivalDate: { type: Date, required: true },
    departureDate: { type: Date },
    reason: { type: String, required: true },
    qrCode: { type: String }, // Store the path/url to the QR code
    accessCode: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "pending",
    },
    lastStatusUpdate: { type: Date, default: Date.now }, // Track last status update
  },
  { timestamps: true }
);

export const Guest = model<IGuest>("Guest", guestSchema);
