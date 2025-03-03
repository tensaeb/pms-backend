import express from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticate } from "../middlewares/authMiddleware"; // Adjust as needed

const router = express.Router();

router.use(authenticate);

// Get user notifications
router.get("/user/:recipientId", notificationController.getUserNotifications);

// Mark a notification as read
router.put("/read/:notificationId", notificationController.markAsRead);

// Create a push notification
router.post("/push", notificationController.createPushNotification);

// Create an email notification
router.post("/email", notificationController.createEmailNotification);

// Create an SMS notification
// router.post("/sms", notificationController.createSMSNotification);

export default router;
