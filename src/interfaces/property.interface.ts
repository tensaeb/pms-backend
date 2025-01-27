// property.types.ts
import { Document, Types } from "mongoose";

export interface IPhoto {
  id: string;
  url: string;
}
export enum PropertyType {
  APARTMENT = "apartment",
  HOUSE = "house",
  COMMERCIAL = "commercial",
  LAND = "land",
  CONDOMINIUM = "condominium",
  VILLA = "villa",
  OFFICE = "office",
  WAREHOUSE = "warehouse",
  INDUSTRIAL = "industrial",
  RETAIL = "retail",
  FARM = "farm",
  COTTAGE = "cottage",
  STUDIO = "studio",
  TOWNHOUSE = "townhouse",
  MOBILE_HOME = "mobile_home",
  DUPLEX = "duplex",
  PENTHOUSE = "penthouse",
  HOSTEL = "hostel",
  RESORT = "resort",
  MOTEL = "motel",
  HOTEL = "hotel",
  MIXED_USE = "mixed_use",
}

export interface IProperty extends Document {
  userCreated: Types.ObjectId;
  title: string;
  description: string;
  address: string;
  price: number;
  rentPrice?: number;
  numberOfUnits: number;
  propertyType: PropertyType;
  floorPlan?: string;
  amenities?: string[];
  status?:
    | "open"
    | "reserved"
    | "closed"
    | "under maintenance"
    | "sold"
    | "deleted";
  photos: IPhoto[];
  createdAt: Date;
  updatedAt: Date;
}
export type PropertyTypeValue = keyof typeof PropertyType;
