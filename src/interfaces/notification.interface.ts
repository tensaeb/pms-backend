import { Document } from "mongoose";

export interface INotification extends Document {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  url: string;
  timestamp: Date;
}
