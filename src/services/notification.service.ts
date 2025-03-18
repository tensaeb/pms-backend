import { Server } from "socket.io";
import { Notification } from "../models/notification.model";
import {
  sendEmail,
  sendPushNotification,
  // sendSMS,
} from "../utils/notification.util";
import logger from "../utils/logger";

class NotificationServices {
  async createNotification(
    recipientId: string,
    title: string,
    message: string,
    type: string = "info"
  ) {
    const notification = new Notification({
      recipientId,
      title,
      message,
      type,
    });
    await notification.save();
    return notification;
  }

  async getUserNotifications(
    recipientId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit; // calculate documents to skip
    const notifications = await Notification.find({ recipientId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipientId }); // total document number

    //logger
    logger.info(
      `NotificationService: Get user notifications for recipientId: ${recipientId}`
    );

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(notificationId: string) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    //logger info
    logger.info(
      `NotificationService: Marked as read notification with id: ${notificationId}`
    );
  }

  // Send a push notification
  async createPushNotification(
    io: Server,
    recipientId: string,
    title: string,
    message: string
  ) {
    await sendPushNotification(io, recipientId, title, message);
    return this.createNotification(recipientId, title, message, "info");
  }

  // Send an email notification
  async createEmailNotification(
    email: string,
    subject: string,
    message: string
  ) {
    await sendEmail(email, subject, message);
    return { email, subject, message };
  }

  // Send an SMS notification
  // async createSMSNotification(phoneNumber: string, message: string) {
  //   await sendSMS(phoneNumber, message);
  //   return { phoneNumber, message };
  // }
}

export const notificationServices = new NotificationServices();
