import multer from "multer";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import sendEmail from "../helpers/mailer";
import { User } from "../models/user.model";
import logger from "../utils/logger";
import { Tenant } from "../models/tenant.model";
import { ITenant } from "../interfaces/tenant.interface";
import { IUser } from "../interfaces/user.interface";

class AuthService {
  private generateToken(user: any, expiresIn: string): string {
    logger.info(
      `AuthService: generateToken - Generating token for user: ${user.id} with expiresIn: ${expiresIn}`
    );
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn }
    );
  }

  // Login user
  async loginUser(
    email: string,
    password: string
  ): Promise<{
    token: string;
    refreshToken: string;
    user: IUser;
    tenant: ITenant | null;
  }> {
    logger.info(`AuthService: loginUser called with email: ${email}`);
    try {
      const user = await User.findOne({ email })
        .populate("registeredBy")
        .populate("registeredByAdmin");

      if (!user) {
        logger.error(
          `AuthService: loginUser - Invalid credentials for email: ${email} - User not found`
        );
        throw new Error("Invalid credentials");
      }

      if (user.status === "inactive") {
        logger.error(
          `AuthService: loginUser - Account is inactive for email: ${email}`
        );
        throw new Error("Account is not active. Please contact administrator.");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.error(
          `AuthService: loginUser - Invalid credentials for email: ${email} - Password did not match`
        );
        throw new Error("Invalid credentials");
      }
      // token and refreshToken should be defined before used in this syntax
      const token: string = this.generateToken(user, "24h");
      const refreshToken: string = this.generateToken(user, "24h");
      let tenant: ITenant | null = null;
      if (user.role === "Tenant") {
        logger.info(
          `AuthService: loginUser - Attempting to find tenant with email: ${user.email}`
        ); // Log before query
        tenant = await Tenant.findOne({
          "contactInformation.email": user.email,
        }).lean();
        logger.info(
          `AuthService: loginUser - Tenant found: ${JSON.stringify(tenant)}`
        ); // Log after query
      }

      logger.info(
        `AuthService: loginUser - User logged in successfully email: ${email}`
      );

      return {
        token: token, // Include token data, with explicit assignment
        refreshToken: refreshToken, // Include refreshToken data, with explicit assignment
        user: user.toObject(), // toObject will cast IUser (Document) -> Object
        tenant, // Include tenant data
      };
    } catch (error) {
      logger.error(`AuthService: loginUser failed for email ${email}`, error);
      throw error;
    }
  }

  // Refresh token
  refreshToken(refreshToken: string) {
    logger.info(
      `AuthService: refreshToken called with refreshToken: ${refreshToken}`
    );
    try {
      const user = jwt.verify(refreshToken, process.env.JWT_SECRET as string);
      const newAccessToken = this.generateToken(user, "1h");
      logger.info(
        `AuthService: refreshToken - Generated new access token for user: ${
          (user as any).id
        }`
      );
      return newAccessToken;
    } catch (err) {
      logger.error(
        `AuthService: refreshToken - Invalid refresh token: ${refreshToken}`,
        err
      );
      throw new Error("Invalid refresh token");
    }
  }
  // Request password reset
  async requestPasswordReset(email: string) {
    logger.info(`AuthService: requestPasswordReset called for email: ${email}`);
    try {
      const user = await User.findOne({ email });
      if (!user) {
        logger.error(
          `AuthService: requestPasswordReset - User not found for email: ${email}`
        );
        throw new Error("User not found");
      }

      const resetCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      user.resetCode = resetCode;
      await user.save();
      logger.info(
        `AuthService: requestPasswordReset - Reset code generated and saved for email: ${email}`
      );

      await sendEmail(
        user.email,
        "Password Reset Request",
        `Your password reset code is ${resetCode}`
      );
      logger.info(
        `AuthService: requestPasswordReset - Password reset code sent to email: ${email}`
      );
    } catch (error) {
      logger.error(
        `AuthService: requestPasswordReset failed for email ${email}`,
        error
      );
      throw error;
    }
  }
}
export const authService = new AuthService();
