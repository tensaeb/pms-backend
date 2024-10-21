import { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "User" | "Admin" | "SuperAdmin" | "Tenant";
  phoneNumber?: string;
  address?: string;
  status: "active" | "inactive";
  photo?: string;
  resetCode?: string;
  resetCodeExpiration?: Date;
  activeStart?: Date;
  activeEnd?: Date;
  registeredBy: {
    type: typeof Schema.Types.ObjectId;
    ref: string;
  };
}
