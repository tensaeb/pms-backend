import bcrypt from "bcryptjs";
import fs from "fs";
import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user.model";
import { Lease } from "../models/lease.model";
import { Maintenance } from "../models/maintenance.model";
import { Property } from "../models/property.model";
import { Tenant } from "../models/tenant.model";
import { Model, Types } from "mongoose";
import { randomInt } from "crypto";
import path from "path";

// Define the return type for methods that need to include unhashedPassword
export type UserWithUnhashedPassword = {
  unhashedPassword: string;
} & ReturnType<Model<IUser>["hydrate"]>;

class UserService {
  // Private helper to check for active end and change user status
  private async checkAndSetUserActiveStatus(user: IUser): Promise<IUser> {
    if (user.role === "SuperAdmin") {
      return user;
    }

    if (user.activeEnd) {
      if (user.activeEnd < new Date()) {
        user.status = "inactive";
        await this.recursivelyDeactivateUsers(user.id.toString());
      } else {
        user.status = "active";
      }
    }

    return await user.save();
  }
  private async recursivelyDeactivateUsers(
    registeredBy: string
  ): Promise<void> {
    const users = await User.find({ registeredBy });

    for (const user of users) {
      if (user.role !== "SuperAdmin") {
        user.status = "inactive";
        await user.save();
        await this.recursivelyDeactivateUsers(user.id.toString());
      }
    }
  }

  // Create a SuperUser if the database is empty
  public async createSuperUser(
    userData: Partial<IUser>,
    file?: Express.Multer.File
  ): Promise<UserWithUnhashedPassword> {
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      throw new Error(
        "SuperUser creation is only allowed when there are no users in the database."
      );
    }

    const { name, email } = userData;

    if (!name || !email) {
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
    });

    const savedSuperUser = await superUser.save();
    const userWithPassword = savedSuperUser.toObject();
    return {
      ...userWithPassword,
      unhashedPassword: password,
    } as UserWithUnhashedPassword;
  }

  public async createUser(
    userData: Partial<IUser>,
    loggedInUserId: string | undefined,
    file?: Express.Multer.File
  ): Promise<UserWithUnhashedPassword> {
    const { name, email, phoneNumber, address, role, status } = userData;

    if (!loggedInUserId) {
      throw new Error("Logged in user ID is required");
    }

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
    }

    const savedUser = await newUser.save();
    const userObject = savedUser.toObject();
    return {
      ...userObject,
      unhashedPassword: password,
    } as UserWithUnhashedPassword;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and status
    user.password = hashedPassword;
    user.status = "active";

    return await user.save();
  }

  // Get all users with pagination, search, and filtering
  public async getAllUsers(query: any): Promise<{
    users: Partial<IUser>[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
  }> {
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
      .select("name email phoneNumber role status");
    const updatedUsers = await Promise.all(
      users.map(async (user) => this.checkAndSetUserActiveStatus(user))
    );

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get regular users with pagination and search
  public async getUsers(query: any) {
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get Super Admin users with pagination and search
  public async getSuperAdminUsers(query: any) {
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  // Get Admin users with pagination and search
  public async getAdminUsers(query: any) {
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }
  // Get user by ID
  async getUserById(id: string) {
    const user = await User.findById(id);
    return await this.checkAndSetUserActiveStatus(user!);
  }

  // Update user by ID
  async updateUser(id: string, updateData: any, file?: Express.Multer.File) {
    const user = await User.findById(id);
    if (!user) {
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
    }
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return await this.checkAndSetUserActiveStatus(updatedUser!);
  }

  async getUsersRegisteredBy(loggedInUserId: string): Promise<IUser[]> {
    if (!loggedInUserId) {
      throw new Error("Logged-in user ID is required");
    }

    const users = await User.find({ registeredBy: loggedInUserId }).select(
      "name email phoneNumber role status address"
    );
    const updatedUsers = await Promise.all(
      users.map(async (user) => this.checkAndSetUserActiveStatus(user))
    );
    return updatedUsers;
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
    const updatedUser = await user.save();

    return this.checkAndSetUserActiveStatus(updatedUser);
  }

  async updateUserPhoto(userId: string, file: Express.Multer.File) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      const profileFolder = path.join("uploads", "profile", userId);

      if (!fs.existsSync(profileFolder)) {
        fs.mkdirSync(profileFolder, { recursive: true });
      }
      const newPhotoPath = path.join(profileFolder, file.filename);
      if (user.photo) {
        await this.deletePhotoFile(user.photo);
      }
      fs.renameSync(file.path, newPhotoPath);
      user.photo = newPhotoPath;
      const savedUser = await user.save();
      return await this.checkAndSetUserActiveStatus(savedUser);
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
        const updatedUser = await user.save();
        return await this.checkAndSetUserActiveStatus(updatedUser);
      }
      return await this.checkAndSetUserActiveStatus(user);
    } catch (error) {
      throw error;
    }
  }
  public async recursivelyInactiveUsers(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "SuperAdmin") {
      throw new Error("Super Admins cannot be deactivated using this endpoint");
    }
    user.status = "inactive";
    await user.save();
    await this.recursivelyDeactivateUsers(user.id.toString());
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
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

    return {
      users: updatedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      totalUsers,
    };
  }

  public async getUserStatusByEmail(
    email: string
  ): Promise<{ status: string } | null> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User is not found");
    }

    // const updatedUser = await this.checkAndSetUserActiveStatus(user);

    const status = user.status;

    const response = { status: status };

    return response;
  }
}

export const userService = new UserService();
