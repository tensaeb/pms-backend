import nodemailer from "nodemailer";
import { Server } from "socket.io";
import twilio from "twilio";

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendEmail(
  email: string,
  subject: string,
  message: string
): Promise<void> {
  await emailTransporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text: message,
  });
}

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<void> {
  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}

export async function sendPushNotification(
  io: Server,
  recipientId: string,
  title: string,
  message: string
): Promise<void> {
  io.to(recipientId).emit("newNotification", { title, message });
}
