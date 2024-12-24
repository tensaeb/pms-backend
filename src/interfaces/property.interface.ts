import { Document, Types } from "mongoose";

export interface IPhoto {
  id: string;
  url: string;
}

export interface IProperty extends Document {
  userCreated: Types.ObjectId;
  title: string;
  description: string;
  address: string;
  price: number;
  rentPrice?: number;
  numberOfUnits: number;
  propertyType: string;
  floorPlan?: string;
  amenities?: string[];
  status?:
    | "open"
    | "reserved"
    | "closed"
    | "under Maintenance"
    | "leased"
    | "sold";
  photos: IPhoto[];
  createdAt: Date;
  updatedAt: Date;
}
