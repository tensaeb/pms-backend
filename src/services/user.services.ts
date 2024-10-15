import bcrypt from "bcryptjs";
import fs from "fs";
import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user.model";

class UserService {
  // Create a SuperUser if the database is empty
  public async createSuperUser(userData: Partial<IUser>): Promise<IUser> {
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
      status: "Active",
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
    const { page = 1, limit = 5, search = "", role, status } = query;

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

  // Delete user
  async deleteUser(id: string) {
    const user = await User.findByIdAndDelete(id);
    if (user && user.photo) {
      fs.unlinkSync(user.photo);
    }
    return user;
  }
}

export const userService = new UserService();
