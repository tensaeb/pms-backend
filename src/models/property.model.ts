import { Schema, model } from "mongoose";
import { IPhoto, IProperty } from "../interfaces/property.interface";

const photoSchema = new Schema<IPhoto>({
  id: { type: String, required: true },
  url: { type: String, required: true },
});

const propertySchema = new Schema<IProperty>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    price: { type: Number, required: true },
    rentPrice: { type: Number },
    numberOfUnits: { type: Number, required: true },
    propertyType: { type: String, required: true },
    floorPlan: { type: String },
    amenities: [String],
    photos: { type: [photoSchema], default: [] },
  },
  { timestamps: true }
);

export const Property = model<IProperty>("Property", propertySchema);
