import { createTransport, Transporter } from "nodemailer";

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
    user: "tnsaebz@mail.ee", // Full email address
    pass: "89Y2jQnsRC", // Special password from web interface
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
    from: "tnsaebz@mail.ee",
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
