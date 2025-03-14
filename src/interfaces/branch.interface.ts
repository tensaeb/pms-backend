// src/interfaces/branch.interface.ts
import { Types } from "mongoose";

export interface IBranch {
  name: string;
  address?: string;
  contactPerson?: string;
  admin?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
