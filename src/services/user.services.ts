import bcrypt from "bcryptjs";
import fs from "fs";
import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user.model";
import { Lease } from "../models/lease.model";
import { Maintenance } from "../models/maintenance.model";
import { Property } from "../models/property.model";
import { Tenant } from "../models/tenant.model";
import { Types } from "mongoose";

class UserService {
  // Create a SuperUser if the database is empty
  public async createSuperUser(
    userData: Partial<IUser>,
    file?: Express.Multer.File
  ): Promise<IUser> {
    const userCount = await User.countDocuments(); // Check if there are any users in the database

    if (userCount > 0) {
      throw new Error(
        "SuperUser creation is only allowed when there are no users in the database."
      );
    }

    const { name, email, password } = userData;

    if (!name || !email || !password) {
      throw new Error(
        "Name, email, and password are required for SuperUser creation."
      );
    }

    const hashedPassword = await bcrypt.hash(password!, 10);

    const superUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "SuperAdmin", // Assign the SuperAdmin role
      status: "active",
      registeredBy: null, // No one is registering this SuperUser manually
    });

    return await superUser.save();
  }

  //create user
  public async createUser(
    userData: Partial<IUser>,
    loggedInUserId: string | undefined,
    file?: Express.Multer.File
  ): Promise<IUser> {
    const { name, email, phoneNumber, address, role, status, password } =
      userData;

    if (!loggedInUserId) {
      throw new Error("Logged in user ID is required");
    }

    const hashedPassword = await bcrypt.hash(password!, 10);

    const newUser = new User({
      name,
      email,
      phoneNumber,
      address,
      role,
      status,
      password: hashedPassword,
      registeredBy: loggedInUserId, // Set the registeredBy field
    });

    if (userData.role === "Admin") {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      newUser.activeStart = startOfDay;
      newUser.activeEnd = endOfDay;
    }

    if (file) {
      newUser.photo = file.filename;
    }

    return await newUser.save();
  }

  // Get all users with pagination, search, and filtering
  public async getAllUsers(query: any): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
    const { page = 1, limit = 20, search = "", role, status } = query;

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
      .select("name email phoneNumber role status");

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get regular users with pagination and search
  public async getUsers(query: any) {
    const { page = 1, limit = 5, search = "" } = query;
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

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get Super Admin users with pagination and search
  public async getSuperAdminUsers(query: any) {
    const { page = 1, limit = 5, search = "" } = query;
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

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get Admin users with pagination and search
  public async getAdminUsers(query: any) {
    const { page = 1, limit = 5, search = "" } = query;
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

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }
  // Get user by ID
  async getUserById(id: string) {
    return await User.findById(id).select("name email role photo address");
  }

  // Update user by ID
  async updateUser(id: string, updateData: any, file?: Express.Multer.File) {
    if (file) {
      updateData.photo = file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async getUsersRegisteredBy(loggedInUserId: string): Promise<IUser[]> {
    if (!loggedInUserId) {
      throw new Error("Logged-in user ID is required");
    }

    return await User.find({ registeredBy: loggedInUserId }).select(
      "name email phoneNumber role status address"
    );
  }

  //Items created by user
  async fetchUserItems(userId: string) {
    const tenants = await Tenant.find({ user: userId });
    const properties = await Property.find({ admin: userId });
    const maintenanceRequests = await Maintenance.find({ user: userId });
    const leases = await Lease.find({ user: userId });

    return {
      tenants,
      properties,
      maintenanceRequests,
      leases,
    };
  }

  // Delete user
  async deleteUser(id: string) {
    const user = await User.findByIdAndDelete(id);
    if (user && user.photo) {
      fs.unlinkSync(user.photo);
    }
    return user;
  }
  public async deleteUserWithConnections(userId: string): Promise<void> {
    try {
      // Fetch the user to ensure it exists
      const user = await User.findById(userId);
      if (!user) {
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
    } catch (error: any) {
      // Log the error to track issues in the service
      console.error(`Failed to delete user ${userId}:`, error.message);
      throw error; // Rethrow the error to be handled by the controller
    }
  }

  async updatePermissions(
    userId: string,
    permissions: Partial<IUser["permissions"]>
  ): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.permissions = { ...user.permissions, ...permissions };
    await user.save();

    return user;
  }

  async updateUserPhoto(userId: string, file: Express.Multer.File) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Delete old photo if exists
      if (user.photo) {
        await this.deletePhotoFile(user.photo);
      }

      // Update with new photo
      user.photo = file.path;
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  async removeUserPhoto(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.photo) {
        await this.deletePhotoFile(user.photo);
        user.photo = undefined;
        await user.save();
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  private async deletePhotoFile(photoPath: string) {
    try {
      if (fs.existsSync(photoPath)) {
        await fs.promises.unlink(photoPath);
      }
    } catch (error) {
      console.error("Error deleting photo file:", error);
      throw error;
    }
  }
}

export const userService = new UserService();
