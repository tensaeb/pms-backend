import { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  photo?: string;
  role: "User" | "Admin" | "SuperAdmin" | "Tenant" | "Maintainer" | "Inspector";
  phoneNumber?: string;
  address?: string;
  status: "active" | "inactive";
  resetCode?: string;
  resetCodeExpiration?: Date;
  activeStart?: Date;
  activeEnd?: Date;
  registeredBy: {
    type: typeof Schema.Types.ObjectId;
    ref: string;
  };
  maintenanceSkills: [string];
  permissions: {
    addProperty: boolean;
    editProperty: boolean;
    deleteProperty: boolean;
    viewProperty: boolean;
    editPropertyPhotos: boolean;
    addTenant: boolean;
    addTenantRequest: boolean;
    editTenant: boolean;
    deleteTenant: boolean;
    editTenantPhotos: boolean;
    addAgreement: boolean;
    editAgreement: boolean;
    deleteAgreement: boolean;
    downloadAgreement: boolean;
    addMaintenanceRecord: boolean;
    editMaintenance: boolean;
    deleteMaintenance: boolean;
  };
}
