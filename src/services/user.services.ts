import bcrypt from "bcryptjs";
import fs from "fs";
import { IUser } from "../interfaces/user.interface";
import { User, ForgetPassword } from "../models/user.model";
import { Lease } from "../models/lease.model";
import { Maintenance } from "../models/maintenance.model";
import { Property } from "../models/property.model";
import { Tenant } from "../models/tenant.model";
import { Model, Types } from "mongoose";
import { randomInt } from "crypto";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sendEmail from "../helpers/mailer";
import logger from "../utils/logger";

class UserService {
  // Private helper to check for active end and change user status
  private async checkAndSetUserActiveStatus(user: IUser): Promise<IUser> {
    logger.info(
      `UserService: checkAndSetUserActiveStatus called for user: ${user.id}`
    );

    if (user.role === "SuperAdmin") {
      logger.info(
        `UserService: checkAndSetUserActiveStatus - SuperAdmin, no status change for user: ${user.id}`
      );
      return user;
    }

    if (user.activeEnd) {
      if (user.activeEnd < new Date()) {
        user.status = "inactive";
        await this.recursivelyDeactivateUsers(user.id.toString());
        logger.info(
          `UserService: checkAndSetUserActiveStatus - User ${user.id} set to inactive.`
        );
      } else {
        user.status = "active";
        logger.info(
          `UserService: checkAndSetUserActiveStatus - User ${user.id} set to active.`
        );
      }
    }
    const savedUser = await user.save();
    logger.info(
      `UserService: checkAndSetUserActiveStatus - User status updated to ${savedUser.status} for user: ${savedUser.id}`
    );
    return savedUser;
  }
  private async recursivelyDeactivateUsers(
    registeredBy: string
  ): Promise<void> {
    logger.info(
      `UserService: recursivelyDeactivateUsers called for users registered by: ${registeredBy}`
    );

    const users = await User.find({ registeredBy });

    for (const user of users) {
      if (user.role !== "SuperAdmin") {
        user.status = "inactive";
        await user.save();
        logger.info(
          `UserService: recursivelyDeactivateUsers - User ${user.id} set to inactive.`
        );
        await this.recursivelyDeactivateUsers(user.id.toString());
      }
    }
    logger.info(
      `UserService: recursivelyDeactivateUsers finished for registeredBy: ${registeredBy}`
    );
  }

  // Create a SuperUser if the database is empty
  public async createSuperUser(
    userData: Partial<IUser>,
    file?: Express.Multer.File
  ): Promise<IUser> {
    logger.info("UserService: createSuperUser called with data:", userData);
    try {
      const userCount = await User.countDocuments();

      if (userCount > 0) {
        logger.error(
          "UserService: createSuperUser - SuperUser creation is only allowed when there are no users in the database."
        );
        throw new Error(
          "SuperUser creation is only allowed when there are no users in the database."
        );
      }

      const { name, email } = userData;

      if (!name || !email) {
        logger.error(
          "UserService: createSuperUser - Name and email are required for SuperUser creation."
        );
        throw new Error("Name and email are required for SuperUser creation.");
      }

      const defaultPassword = randomInt(10000, 100000).toString();
      const password = userData.password || defaultPassword;
      const hashedPassword = await bcrypt.hash(password!, 10);

      const superUser = new User({
        name,
        email,
        password: hashedPassword,
        role: "SuperAdmin",
        status: "active",
        registeredBy: null,
        tempPassword: defaultPassword,
      });

      const savedSuperUser = await superUser.save();
      logger.info(
        "UserService: createSuperUser - SuperUser created successfully:",
        savedSuperUser.id
      );
      // const userWithPassword = savedSuperUser.toObject();
      return savedSuperUser;
    } catch (error) {
      logger.error("UserService: createSuperUser failed:", error);
      throw error;
    }
  }

  public async createUser(
    userData: Partial<IUser>,
    loggedInUserId: string | undefined,
    file?: Express.Multer.File
  ): Promise<IUser> {
    logger.info(
      `UserService: createUser called with data: ${JSON.stringify(
        userData
      )} loggedInUserId: ${loggedInUserId}`
    );
    try {
      if (!loggedInUserId) {
        logger.error("UserService: createUser - Logged in user ID is required");
        throw new Error("Logged in user ID is required");
      }

      const { name, email, phoneNumber, address, role, status } = userData;

      const defaultPassword = randomInt(10000, 100000).toString();
      const password = userData.password || defaultPassword;
      const hashedPassword = await bcrypt.hash(password!, 10);

      const newUser = new User({
        name,
        email,
        phoneNumber,
        address,
        role,
        status,
        tempPassword: defaultPassword,
        password: hashedPassword,
        registeredBy: loggedInUserId,
      });

      if (file) {
        const profileFolder = path.join("uploads", "profile", newUser.id);

        if (!fs.existsSync(profileFolder)) {
          fs.mkdirSync(profileFolder, { recursive: true });
        }
        const newPhotoPath = path.join(profileFolder, file.filename);
        fs.renameSync(file.path, newPhotoPath);
        newUser.photo = newPhotoPath;
        logger.info(
          `UserService: createUser - Photo added for user: ${newUser.id}`
        );
      }

      const savedUser = await newUser.save();
      logger.info(
        `UserService: createUser - User created successfully: ${savedUser.id}`
      );
      return savedUser;
    } catch (error) {
      logger.error("UserService: createUser failed:", error);
      throw error;
    }
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<IUser> {
    logger.info(`UserService: resetPassword called for userId: ${userId}`);
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error(`UserService: resetPassword - User ${userId} not found`);
        throw new Error("User not found");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and status
      user.password = hashedPassword;
      user.status = "active";
      user.tempPassword = "";

      const savedUser = await user.save();
      logger.info(
        `UserService: resetPassword - Password reset successful for userId: ${userId}`
      );
      return savedUser;
    } catch (error) {
      logger.error(
        `UserService: resetPassword failed for userId: ${userId}`,
        error
      );
      throw error;
    }
  }
  // Forget Password
  public async forgotPassword(email: string): Promise<void> {
    logger.info(`UserService: forgotPassword called for email: ${email}`);
    try {
      const userMain = await User.findOne({ email });
      if (!userMain) {
        logger.error(
          `UserService: forgotPassword - User with email ${email} not found.`
        );
        throw new Error("User with this email not found");
      }

      const resetCode = randomInt(100000, 999999).toString(); // Generate 6 digit code
      const resetCodeExpiration = new Date();
      resetCodeExpiration.setHours(resetCodeExpiration.getHours() + 1);

      await ForgetPassword.findOneAndUpdate(
        { email },
        { resetCode, resetCodeExpiration },
        { new: true, upsert: true }
      );

      //send the reset code to the email
      await sendEmail(
        userMain.email,
        "Password Reset Request",
        "Plain text version for email clients that don't support HTML", // Text fallback
        `<!DOCTYPE html>
           <html>
             <body>
               <p>Please use the following code to reset your password:</p>
               <p style="font-size: 24px; margin-bottom: 10px;">${resetCode}</p>
               <p>This code will expire after one hour.</p>
             </body>
           </html>`
      );
      logger.info(
        `UserService: forgotPassword - Password reset code sent to email: ${email}`
      );
    } catch (error) {
      logger.error(
        `UserService: forgotPassword failed for email: ${email}`,
        error
      );
      throw error;
    }
  }

  public async verifyPasswordResetCode(
    email: string,
    resetCode: string
  ): Promise<boolean> {
    logger.info(
      `UserService: verifyPasswordResetCode called for email: ${email}, code: ${resetCode}`
    );
    try {
      const forgetPasswordEntry = await ForgetPassword.findOne({
        email,
        resetCode,
        resetCodeExpiration: { $gt: new Date() }, // check for expiration
      });
      const isValid = !!forgetPasswordEntry;
      logger.info(
        `UserService: verifyPasswordResetCode - Code is valid: ${isValid}`
      );
      return isValid; // true if a valid entry is found
    } catch (error) {
      logger.error(
        `UserService: verifyPasswordResetCode failed for email ${email} code: ${resetCode}`,
        error
      );
      throw error;
    }
  }

  public async resetPasswordWithCode(
    email: string,
    newPassword: string,
    resetCode: string
  ): Promise<IUser> {
    logger.info(
      `UserService: resetPasswordWithCode called for email: ${email}, resetCode: ${resetCode}`
    );
    try {
      const isCodeValid = await this.verifyPasswordResetCode(email, resetCode);
      if (!isCodeValid) {
        logger.error(
          `UserService: resetPasswordWithCode - Invalid or expired reset code for email: ${email}`
        );
        throw new Error("Invalid or expired reset code");
      }

      const user = await User.findOne({ email });

      if (!user) {
        logger.error(
          `UserService: resetPasswordWithCode - User not found for email ${email}`
        );
        throw new Error("User not found");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and status
      user.password = hashedPassword;
      user.status = "active";
      user.tempPassword = "";
      await ForgetPassword.deleteOne({ email });

      const savedUser = await user.save();
      logger.info(
        `UserService: resetPasswordWithCode - Password reset successful for email: ${email} code: ${resetCode}`
      );
      return savedUser;
    } catch (error) {
      logger.error(
        `UserService: resetPasswordWithCode failed for email ${email}, code: ${resetCode}`,
        error
      );
      throw error;
    }
  }

  // Get all users with pagination, search, and filtering
  public async getAllUsers(query: any): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getAllUsers called with query: ${JSON.stringify(query)}`
    );
    try {
      const { page = 1, limit = 10, search = "", role, status } = query;

      // Build the search query with optional filters
      const searchQuery: any = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };

      if (role) {
        searchQuery.role = role;
      }

      if (status) {
        searchQuery.status = status;
      }

      // Fetch users with pagination
      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status activeStart activeEnd");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );

      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getAllUsers - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error("UserService: getAllUsers failed", error);
      throw error;
    }
  }

  // Get regular users with pagination and search
  public async getUsers(query: any) {
    logger.info(
      `UserService: getUsers called with query: ${JSON.stringify(query)}`
    );
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const searchQuery: any = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
        role: "User", // Regular user role
      };

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email phoneNumber role photo status address");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );

      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getUsers - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error("UserService: getUsers failed", error);
      throw error;
    }
  }

  public async getUsersByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getUsersByRegisteredBy called for registeredBy: ${registeredBy} query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", role, status } = query;

      const searchQuery: any = {
        registeredBy,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };

      if (role) {
        searchQuery.role = role;
      }

      if (status) {
        searchQuery.status = status;
      }

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getUsersByRegisteredBy - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error(
        `UserService: getUsersByRegisteredBy failed for registeredBy ${registeredBy}`,
        error
      );
      throw error;
    }
  }
  public async getUserRoleUsingRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getUserRoleUsingRegisteredBy called for registeredBy: ${registeredBy} query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", role, status } = query;

      const searchQuery: any = {
        registeredBy,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
        role: "User",
      };

      if (role) {
        searchQuery.role = role;
      }

      if (status) {
        searchQuery.status = status;
      }

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getUserRoleUsingRegisteredBy - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );
      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error(
        `UserService: getUserRoleUsingRegisteredBy failed for registeredBy ${registeredBy}`,
        error
      );
      throw error;
    }
  }

  // Get Super Admin users with pagination and search
  public async getSuperAdminUsers(query: any) {
    logger.info(
      `UserService: getSuperAdminUsers called with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const searchQuery: any = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
        role: "SuperAdmin",
      };

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email phoneNumber role photo status address");

      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getSuperAdminUsers - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error("UserService: getSuperAdminUsers failed", error);
      throw error;
    }
  }

  // Get Admin users with pagination and search
  public async getAdminUsers(query: any) {
    logger.info(
      `UserService: getAdminUsers called with query: ${JSON.stringify(query)}`
    );
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const searchQuery: any = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
        role: "Admin",
      };

      // Include activeStart and activeEnd in the selected fields
      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "name email phoneNumber role photo status address activeStart activeEnd"
        );
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getAdminUsers - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error("UserService: getAdminUsers failed", error);
      throw error;
    }
  }
  // Get user by ID
  async getUserById(id: string) {
    logger.info(`UserService: getUserById called for userId: ${id}`);
    try {
      const user = await User.findById(id)
        .populate("registeredBy")
        .populate("registeredByAdmin");
      if (!user) {
        logger.error(`UserService: getUserById - User ${id} not found`);
      }

      const updatedUser = await this.checkAndSetUserActiveStatus(user!);
      logger.info(
        `UserService: getUserById - Fetched user with ID: ${updatedUser.id}`
      );
      return updatedUser;
    } catch (error) {
      logger.error(`UserService: getUserById failed for userId: ${id}`, error);
      throw error;
    }
  }

  // Update user by ID
  async updateUser(id: string, updateData: any, file?: Express.Multer.File) {
    logger.info(
      `UserService: updateUser called for userId: ${id} with data: ${JSON.stringify(
        updateData
      )}`
    );
    try {
      const user = await User.findById(id);
      if (!user) {
        logger.error(`UserService: updateUser - User with ID ${id} not found`);
        throw new Error("User not found");
      }

      if (file) {
        const profileFolder = path.join("uploads", "profile", id);

        if (!fs.existsSync(profileFolder)) {
          fs.mkdirSync(profileFolder, { recursive: true });
        }
        const newPhotoPath = path.join(profileFolder, file.filename);
        fs.renameSync(file.path, newPhotoPath);
        updateData.photo = newPhotoPath;
        logger.info(
          `UserService: updateUser - Photo updated for userId: ${id}`
        );
      }
      const updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      const updatedUserWithStatus = await this.checkAndSetUserActiveStatus(
        updatedUser!
      );
      logger.info(
        `UserService: updateUser - User updated successfully ${updatedUserWithStatus.id}`
      );
      return updatedUserWithStatus;
    } catch (error) {
      logger.error(`UserService: updateUser failed for userId: ${id}`, error);
      throw error;
    }
  }

  async getUsersRegisteredBy(loggedInUserId: string): Promise<IUser[]> {
    logger.info(
      `UserService: getUsersRegisteredBy called for loggedInUserId: ${loggedInUserId}`
    );
    try {
      if (!loggedInUserId) {
        logger.error(
          "UserService: getUsersRegisteredBy - Logged-in user ID is required"
        );
        throw new Error("Logged-in user ID is required");
      }

      const users = await User.find({ registeredBy: loggedInUserId }).select(
        "name email phoneNumber role status address"
      );
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      logger.info(
        `UserService: getUsersRegisteredBy - Fetched ${updatedUsers.length} users for loggedInUserId: ${loggedInUserId}`
      );
      return updatedUsers;
    } catch (error) {
      logger.error(
        `UserService: getUsersRegisteredBy failed for loggedInUserId: ${loggedInUserId}`,
        error
      );
      throw error;
    }
  }

  //Items created by user
  async fetchUserItems(userId: string) {
    logger.info(`UserService: fetchUserItems called for userId: ${userId}`);
    try {
      const tenants = await Tenant.find({ user: userId });
      const properties = await Property.find({ admin: userId });
      const maintenanceRequests = await Maintenance.find({ user: userId });
      const leases = await Lease.find({ user: userId });
      logger.info(
        `UserService: fetchUserItems - Fetched items for userId ${userId}`
      );

      return {
        tenants,
        properties,
        maintenanceRequests,
        leases,
      };
    } catch (error) {
      logger.error(
        `UserService: fetchUserItems failed for userId ${userId}`,
        error
      );
      throw error;
    }
  }

  // Delete user
  async deleteUser(id: string) {
    logger.info(`UserService: deleteUser called for userId: ${id}`);
    try {
      const user = await User.findByIdAndDelete(id);
      if (user && user.photo) {
        fs.unlinkSync(user.photo);
        logger.info(`UserService: deleteUser - Photo deleted for userId ${id}`);
      }
      logger.info(`UserService: deleteUser - Deleted user with ID: ${id}`);
      return user;
    } catch (error) {
      logger.error(`UserService: deleteUser failed for userId ${id}`, error);
      throw error;
    }
  }
  public async deleteUserWithConnections(userId: string): Promise<void> {
    logger.info(
      `UserService: deleteUserWithConnections called for userId: ${userId}`
    );
    try {
      // Fetch the user to ensure it exists
      const user = await User.findById(userId);
      if (!user) {
        logger.error(
          `UserService: deleteUserWithConnections - User with ID ${userId} not found`
        );
        throw new Error(`User with ID ${userId} not found`);
      }

      // Find and delete all entities referencing the user
      await Lease.deleteMany({ $or: [{ user: userId }, { tenant: userId }] });
      await Maintenance.deleteMany({ user: userId });
      await Property.deleteMany({ admin: userId });
      await Tenant.deleteMany({ user: userId });

      // Find connected users and delete recursively
      const connectedUsers = await User.find({ registeredBy: userId });
      for (const connectedUser of connectedUsers) {
        const connectedUserId =
          connectedUser._id instanceof Types.ObjectId
            ? connectedUser._id.toString()
            : (connectedUser._id as string);

        await this.deleteUserWithConnections(connectedUserId); // Recursive call
      }
      // Delete the user
      await User.findByIdAndDelete(userId);
      logger.info(
        `UserService: deleteUserWithConnections - Deleted user with ID ${userId} and connections`
      );
    } catch (error) {
      logger.error(
        `UserService: deleteUserWithConnections failed for userId ${userId}`,
        error
      );
      throw error;
    }
  }

  async updatePermissions(
    userId: string,
    permissions: Partial<IUser["permissions"]>
  ): Promise<IUser | null> {
    logger.info(
      `UserService: updatePermissions called for userId: ${userId}, permissions: ${JSON.stringify(
        permissions
      )}`
    );
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error(
          `UserService: updatePermissions - User with ID ${userId} not found`
        );
        throw new Error("User not found");
      }

      user.permissions = { ...user.permissions, ...permissions };
      const updatedUser = await user.save();
      logger.info(
        `UserService: updatePermissions - Permissions updated for userId: ${userId}`
      );
      return await this.checkAndSetUserActiveStatus(updatedUser);
    } catch (error) {
      logger.error(
        `UserService: updatePermissions failed for userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  async updateUserPhoto(userId: string, file: Express.Multer.File) {
    logger.info(`UserService: updateUserPhoto called for userId: ${userId}`);
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error(
          `UserService: updateUserPhoto - User with ID ${userId} not found`
        );
        throw new Error("User not found");
      }
      const profileFolder = path.join("uploads", "profile", userId);

      if (!fs.existsSync(profileFolder)) {
        fs.mkdirSync(profileFolder, { recursive: true });
      }
      const newPhotoPath = path.join(profileFolder, file.filename);
      if (user.photo) {
        await this.deletePhotoFile(user.photo);
        logger.info(
          `UserService: updateUserPhoto - Old photo deleted for userId: ${userId}`
        );
      }
      fs.renameSync(file.path, newPhotoPath);
      user.photo = newPhotoPath;
      const savedUser = await user.save();
      logger.info(
        `UserService: updateUserPhoto - Photo updated for userId: ${userId}`
      );
      return await this.checkAndSetUserActiveStatus(savedUser);
    } catch (error) {
      logger.error(
        `UserService: updateUserPhoto failed for userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  async removeUserPhoto(userId: string) {
    logger.info(`UserService: removeUserPhoto called for userId: ${userId}`);
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error(
          `UserService: removeUserPhoto - User with ID ${userId} not found`
        );
        throw new Error("User not found");
      }

      if (user.photo) {
        await this.deletePhotoFile(user.photo);
        logger.info(
          `UserService: removeUserPhoto - Old photo deleted for userId: ${userId}`
        );
        user.photo = undefined;
        const updatedUser = await user.save();
        logger.info(
          `UserService: removeUserPhoto - Photo removed for userId: ${userId}`
        );
        return await this.checkAndSetUserActiveStatus(updatedUser);
      }
      logger.info(
        `UserService: removeUserPhoto - Photo already removed for userId: ${userId}`
      );
      return await this.checkAndSetUserActiveStatus(user);
    } catch (error) {
      logger.error(
        `UserService: removeUserPhoto failed for userId ${userId}`,
        error
      );
      throw error;
    }
  }
  public async recursivelyInactiveUsers(userId: string): Promise<void> {
    logger.info(
      `UserService: recursivelyInactiveUsers called for userId: ${userId}`
    );
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error(
          `UserService: recursivelyInactiveUsers - User with ID ${userId} not found`
        );
        throw new Error("User not found");
      }

      if (user.role === "SuperAdmin") {
        logger.error(
          `UserService: recursivelyInactiveUsers - Super Admins cannot be deactivated using this endpoint`
        );
        throw new Error(
          "Super Admins cannot be deactivated using this endpoint"
        );
      }
      user.status = "inactive";
      await user.save();
      logger.info(
        `UserService: recursivelyInactiveUsers - User ${userId} set to inactive.`
      );
      await this.recursivelyDeactivateUsers(user.id.toString());
    } catch (error) {
      logger.error(
        `UserService: recursivelyInactiveUsers failed for userId ${userId}`,
        error
      );
      throw error;
    }
  }
  private async deletePhotoFile(photoPath: string) {
    try {
      if (fs.existsSync(photoPath)) {
        await fs.promises.unlink(photoPath);
      }
    } catch (error) {
      logger.error("Error deleting photo file:", error);
      throw error;
    }
  }

  // Get users registered by logged-in user with pagination
  public async getUsersRegisteredByUserId(
    loggedInUserId: string,
    query: any
  ): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getUsersRegisteredByUserId called for loggedInUserId: ${loggedInUserId} with query ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", role, status } = query;
      const searchQuery: any = {
        registeredBy: loggedInUserId,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };

      if (role) {
        searchQuery.role = role;
      }

      if (status) {
        searchQuery.status = status;
      }

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getUsersRegisteredByUserId - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );
      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error(
        `UserService: getUsersRegisteredByUserId failed for loggedInUserId: ${loggedInUserId}`,
        error
      );
      throw error;
    }
  }

  //Get maintainers registered by a specific user
  public async getMaintainersByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getMaintainersByRegisteredBy called for registeredBy: ${registeredBy} with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;

      const searchQuery: any = {
        registeredBy,
        role: "Maintainer",
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };
      if (status) {
        searchQuery.status = status;
      }

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getMaintainersByRegisteredBy - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error(
        `UserService: getMaintainersByRegisteredBy failed for registeredBy: ${registeredBy}`,
        error
      );
      throw error;
    }
  }

  //Get inspectors registered by a specific user

  public async getInspectorsByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    logger.info(
      `UserService: getInspectorsByRegisteredBy called for registeredBy: ${registeredBy} with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;

      const searchQuery: any = {
        registeredBy,
        role: "Inspector",
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };
      if (status) {
        searchQuery.status = status;
      }

      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("name email phoneNumber role status");
      const updatedUsers = await Promise.all(
        users.map(async (user) => this.checkAndSetUserActiveStatus(user))
      );
      const totalUsers = await User.countDocuments(searchQuery);
      logger.info(
        `UserService: getInspectorsByRegisteredBy - Fetched ${updatedUsers.length} users, total: ${totalUsers}`
      );

      return {
        users: updatedUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page),
        totalUsers,
      };
    } catch (error) {
      logger.error(
        `UserService: getInspectorsByRegisteredBy failed for registeredBy: ${registeredBy}`,
        error
      );
      throw error;
    }
  }

  public async getUserStatusByEmail(
    email: string
  ): Promise<{ status: string } | null> {
    logger.info(`UserService: getUserStatusByEmail called for email: ${email}`);
    try {
      const user = await User.findOne({ email });
      if (!user) {
        logger.error(
          `UserService: getUserStatusByEmail - User with email: ${email} not found`
        );
        throw new Error("User is not found");
      }

      const status = user.status;

      const response = { status: status };
      logger.info(
        `UserService: getUserStatusByEmail - Fetched status for user with email: ${email}, status: ${status}`
      );
      return response;
    } catch (error) {
      logger.error(
        `UserService: getUserStatusByEmail failed for email ${email}`,
        error
      );
      throw error;
    }
  }
}
export const userService = new UserService();
