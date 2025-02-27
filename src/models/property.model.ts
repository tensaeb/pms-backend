// property.model.ts
import { Schema, model } from "mongoose";
import {
  IPhoto,
  IProperty,
  PropertyType,
} from "../interfaces/property.interface";

const photoSchema = new Schema<IPhoto>({
  id: { type: String, required: true },
  url: { type: String, required: true },
});

const propertySchema = new Schema<IProperty>(
  {
    userCreated: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    price: { type: Number, required: true },
    rentPrice: { type: Number },
    numberOfUnits: { type: Number },
    propertyType: {
      type: String,
      enum: Object.values(PropertyType),
      required: true,
    },
    floorPlan: { type: String },
    amenities: [String],
    status: {
      type: String,
      enum: [
        "open",
        "reserved",
        "closed",
        "under maintenance",
        "sold",
        "deleted",
      ],
      default: "open",
    },
    photos: { type: [photoSchema], default: [] },
  },
  { timestamps: true }
);

export const Property = model<IProperty>("Property", propertySchema);
