import bcrypt from "bcryptjs";

import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export class AuthService {
  async createUser(
    userData: IUser,
    file?: Express.Multer.File,
    registeredById?: string
  ): Promise<IUser> {
    try {
      const { email, password, role } = userData;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = new User({
        ...userData,
        password: hashedPassword,
        registeredBy: registeredById,
      });

      if (role === "Admin") {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        newUser.activeStart = startOfDay;
        newUser.activeEnd = endOfDay;
      }

      // If file is provided, save photo filename
      if (file) {
        newUser.photo = file.filename;
      }

      return await newUser.save();
    } catch (error: any) {
      throw new Error("Failed to register user");
    }
  }

  async loginUser(
    email: string,
    password: string
  ): Promise<{ token: string; user: IUser }> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Invalid credentials");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
      return { token, user };
    } catch (error: any) {
      throw new Error("Failed to login user");
    }
  }
}
