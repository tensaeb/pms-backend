import { createTransport } from "nodemailer";

// Create a transporter using nodemailer
const transporter = createTransport({
  service: "Gmail", // You can use another email service like 'Yahoo', 'Outlook', etc.
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address (should be in environment variables)
    pass: process.env.EMAIL_PASS, // Your Gmail app-specific password (set in environment variables)
  },
});

// Send email function
const sendEmail = async (to: string, subject: string, text: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address (your Gmail address)
    to, // List of receivers
    subject, // Subject of the email
    text, // Plain text body
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export default sendEmail;
