import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Middleware to protect routes (JWT authentication)
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      req.user = (await User.findById(decoded.id).select("-password")) as IUser;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Middleware to check if user is Admin
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as admin" });
  }
};

// Middleware to check if user is SuperAdmin
export const superAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as SuperAdmin" });
  }
};

// Middleware to check if user's admin account is active
export const checkUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.params.userId; // Assuming you pass user ID in the route
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const now = new Date();

  if (user.role === "Admin" && user.activeEnd && now > user.activeEnd) {
    user.status = "inactive";
    await user.save();
    return res.status(403).json({ message: "Account has expired." });
  }

  next(); // Proceed to the next middleware or route handler
};
