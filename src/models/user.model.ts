import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "User",
        "Admin",
        "SuperAdmin",
        "Tenant",
        "Maintainer",
        "Inspector",
      ],
      default: "User",
    },
    photo: { type: String, default: "" },
    phoneNumber: { type: String },
    address: { type: String },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending",
      set: (val: string) => val.toLowerCase(), // Convert input to lowercase
    },
    resetCode: { type: String },
    resetCodeExpiration: { type: Date },
    activeStart: { type: Date, default: Date.now }, // Set default to now, to auto make created time.
    activeEnd: {
      type: Date,
      default: () => {
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        return twoMonthsFromNow;
      },
    },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    maintenanceSkills: {
      type: [String],
      enum: ["Plumbing", "Electrical", "HVAC", "Appliance Repair", "Other"],
      default: [],
    },
    tempPassword: { type: String },
    permissions: {
      addProperty: { type: Boolean, default: false },
      editProperty: { type: Boolean, default: false },
      deleteProperty: { type: Boolean, default: false },
      viewProperty: { type: Boolean, default: false },
      editPropertyPhotos: { type: Boolean, default: false },
      addTenant: { type: Boolean, default: false },
      addTenantRequest: { type: Boolean, default: false },
      editTenant: { type: Boolean, default: false },
      deleteTenant: { type: Boolean, default: false },
      editTenantPhotos: { type: Boolean, default: false },
      addAgreement: { type: Boolean, default: false },
      editAgreement: { type: Boolean, default: false },
      deleteAgreement: { type: Boolean, default: false },
      downloadAgreement: { type: Boolean, default: false },
      addMaintenanceRecord: { type: Boolean, default: false },
      editMaintenance: { type: Boolean, default: false },
      deleteMaintenance: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const forgetPasswordSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  resetCode: { type: String },
  resetCodeExpiration: { type: Date },
});

export const User = model<IUser>("User", userSchema);
export const ForgetPassword = model<IUser>(
  "ForgetPassword",
  forgetPasswordSchema
);
