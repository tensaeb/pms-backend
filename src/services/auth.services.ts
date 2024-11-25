import multer from "multer";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import sendEmail from "../helpers/mailer";
import { User } from "../models/user.model";

class AuthService {
  private generateToken(user: any, expiresIn: string): string {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn }
    );
  }

  // Login user
  async loginUser(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user, "1h");
    const refreshToken = this.generateToken(user, "24h");

    return {
      token,
      refreshToken,
      user,
    };
  }

  // Refresh token
  refreshToken(refreshToken: string) {
    try {
      const user = jwt.verify(refreshToken, process.env.JWT_SECRET as string);
      const newAccessToken = this.generateToken(user, "1h");
      return newAccessToken;
    } catch (err) {
      throw new Error("Invalid refresh token");
    }
  }
  // Request password reset
  async requestPasswordReset(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const resetCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    user.resetCode = resetCode;
    await user.save();

    await sendEmail(
      user.email,
      "Password Reset Request",
      `Your password reset code is ${resetCode}`
    );
  }
}
export const authService = new AuthService();
