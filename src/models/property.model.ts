import { Schema, model } from "mongoose";
import { IProperty } from "../interfaces/property.interface";

const propertySchema = new Schema<IProperty>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    price: { type: Number, required: true },
    rentPrice: { type: Number },
    numberOfUnits: { type: Number, required: true },
    propertyType: { type: String, required: true },
    floorPlan: { type: String },
    amenities: [String],
    photos: {
      type: [String],
      validate: [
        (val: string[]) => val.length <= 5,
        "Exceeds the limit of 5 photos",
      ],
    },
  },
  { timestamps: true }
);

export const Property = model<IProperty>("Property", propertySchema);
