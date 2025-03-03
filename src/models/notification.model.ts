import { Schema, model } from "mongoose";
import { INotification } from "../interfaces/notification.interface";

const notificationSchema = new Schema<INotification>({
  recipientId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String },
  isRead: { type: Boolean, required: true, default: false },
  url: { type: String, required: false, default: "" },
  type: {
    type: String,
    enum: ["info", "warning", "error"],
    default: "info",
  },
  timestamp: { type: Date, default: Date.now },
});

export const Notification = model<INotification>(
  "Notification",
  notificationSchema
);
