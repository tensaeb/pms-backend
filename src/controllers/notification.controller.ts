import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { notificationServices } from "../services/notification.service";
import { Server } from "socket.io";
import { io } from "../app";

class NotificationController {
  // Get user notifications
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { recipientId } = req.params;
      const page = parseInt(req.query.page as string) || 1; // Default to page 1
      const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page

      const {
        notifications,
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages,
      } = await notificationServices.getUserNotifications(
        recipientId,
        page,
        limit
      );

      const responseData = {
        notifications,
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages,
      };

      res.status(200).json(
        successResponse(
          responseData, // Send the pagination data in the response
          "User notifications fetched successfully"
        )
      );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch user notifications")
        );
    }
  }
  // Mark a notification as read
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const notification = await notificationServices.markAsRead(
        notificationId
      );
      if (!notification) {
        res.status(404).json(errorResponse("Notification not found"));
        return;
      }
      res
        .status(200)
        .json(
          successResponse(
            notification,
            "Notification marked as read successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to mark notification as read")
        );
    }
  }

  // Create a push notification (and send it)
  async createPushNotification(req: Request, res: Response): Promise<void> {
    try {
      const { recipientId, title, message } = req.body;
      const notification = await notificationServices.createPushNotification(
        io,
        recipientId,
        title,
        message
      );
      res
        .status(201)
        .json(
          successResponse(
            notification,
            "Push notification created and sent successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to create push notification")
        );
    }
  }

  // Create an email notification (and send it)
  async createEmailNotification(req: Request, res: Response): Promise<void> {
    try {
      const { email, subject, message } = req.body;
      const notification = await notificationServices.createEmailNotification(
        email,
        subject,
        message
      );
      res
        .status(201)
        .json(
          successResponse(
            notification,
            "Email notification created and sent successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to create email notification")
        );
    }
  }
}

export const notificationController = new NotificationController();
