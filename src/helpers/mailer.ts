import { createTransport, Transporter } from "nodemailer";
import { config } from "dotenv";

config();

interface EmailConfig {
  // service: string;
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  requireTLS: boolean; // true for starttls, false for other ports
  auth: {
    user: string;
    pass: string;
  };

  debug?: boolean; // true for logging
}

const emailConfig: EmailConfig = {
  host: "mail.mail.ee", // SMTP server from provider's docs
  port: 465, // Use SSL port (recommended for reliability)
  secure: true, // SSL encryption (required for port 465)
  requireTLS: false, // Not needed for SSL
  auth: {
    user: process.env.EMAIL_USER as string,
    pass: process.env.EMAIL_PASS as string,
  },
  debug: false,
  // Remove `tls.ciphers` unless explicitly required
};
const transporter: Transporter = createTransport({
  ...emailConfig,
  debug: false, // This
  logger: false,
});

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER as string,
    to,
    subject,
    text, // Plain text fallback
    html, // HTML version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: `, info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export default sendEmail;
