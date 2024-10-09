import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["User", "Admin", "SuperAdmin"],
      default: "User",
    },
    phoneNumber: { type: String },
    address: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    photo: { type: String },
    resetCode: { type: String },
    resetCodeExpiration: { type: Date },
    activeStart: { type: Date },
    activeEnd: { type: Date },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" }, // New field
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
