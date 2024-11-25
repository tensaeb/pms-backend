import { Document, Schema, Types } from "mongoose";

export interface IProperty extends Document {
  admin: Types.ObjectId;
  title: string;
  description: string;
  address: string;
  price: number;
  rentPrice?: number;
  numberOfUnits: number;
  propertyType: string;
  floorPlan?: string;
  amenities?: string[];
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}
