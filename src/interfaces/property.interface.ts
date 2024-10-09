import { Document, Schema } from "mongoose";

export interface IProperty extends Document {
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
}
