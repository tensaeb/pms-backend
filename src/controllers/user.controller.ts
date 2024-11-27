import { NextFunction, Request, Response } from "express";
import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";
import { userService } from "../services/user.services";

class UserController {
  // Create a SuperUser if the database is empty
  public async createSuperUser(req: Request, res: Response): Promise<void> {
    try {
      const superUser = await userService.createSuperUser(req.body);
      res
        .status(201)
        .json(successResponse(superUser, "SuperUser created successfully"));
    } catch (error: any) {
      res
        .status(400)
        .json(errorResponse(error.message, "Failed to create SuperUser"));
    }
  }

  // Create a new user
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const userId = req.user?.id; // Assuming user info from the token
      if (userId === undefined) {
        res.status(401).json(errorResponse("Unauthorized"));
      }

      const newUser = await userService.createUser(req.body, userId!, file); // Fixed: Added '!' to assert non-null assertion
      res
        .status(201)
        .json(successResponse(newUser, "User created successfully"));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  //create new admin user
  public async createAdmin(req: Request, res: Response): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;

      // Check if loggedInUserId is available
      if (!loggedInUserId) {
        res
          .status(400)
          .json(
            errorResponse(
              "Logged in user ID is missing",
              "Failed to create admin"
            )
          );
      }

      const file = req.file;

      if (!loggedInUserId) {
        res
          .status(400)
          .json(
            errorResponse(
              "Logged in user ID is missing",
              "Failed to create Super admin"
            )
          );
      }

      const userData = { ...req.body, role: "Admin" };
      const newAdmin = await userService.createUser(
        userData,
        loggedInUserId,
        file
      );

      res
        .status(201)
        .json(successResponse(newAdmin, "Admin created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create admin"));
    }
  }

  // Create a new SuperAdmin
  public async createSuperAdmin(req: Request, res: Response): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;

      if (!loggedInUserId) {
        res
          .status(400)
          .json(
            errorResponse(
              "Logged in user ID is missing",
              "Failed to create superadmin"
            )
          );
      }

      const file = req.file;
      const userData = { ...req.body, role: "SuperAdmin" };
      const newSuperAdmin = await userService.createUser(
        userData,
        loggedInUserId,
        file
      );
      res
        .status(201)
        .json(
          successResponse(newSuperAdmin, "SuperAdmin created successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create superadmin"));
    }
  }

  // Get all users with pagination
  public async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAllUsers(req.query);
      res
        .status(200)
        .json(successResponse(users, "Users fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch users"));
    }
  }
  // Get users with pagination
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getUsers(req.query);
      res
        .status(200)
        .json(successResponse(users, "Users fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch users"));
    }
  }

  // Get Super Admin users with pagination
  async getSuperAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getSuperAdminUsers(req.query);
      res
        .status(200)
        .json(successResponse(users, "Super Admin users fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch Super Admin users")
        );
    }
  }

  // Get Admin users with pagination
  async getAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAdminUsers(req.query);
      res
        .status(200)
        .json(successResponse(users, "Admin users fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch Admin users"));
    }
  }

  // Get user by ID
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        res.status(404).json(errorResponse("User not found"));
      }
      res.status(200).json(successResponse(user, "User fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch user"));
    }
  }

  // Update user by ID
  async updateUserById(req: Request, res: Response): Promise<void> {
    try {
      const updatedUser = await userService.updateUser(
        req.params.id,
        req.body,
        req.file
      );
      res
        .status(200)
        .json(successResponse(updatedUser, "User updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update user"));
    }
  }

  // Delete user
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.deleteUser(req.params.id);
      res.status(200).json(successResponse(user, "User deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete user"));
    }
  }

  // Delete user with all connections
  public async deleteUserWithConnections(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res
          .status(400)
          .json(errorResponse("User ID is missing", "User ID is required"));
      }

      // Call the service to delete the user and their connections
      await userService.deleteUserWithConnections(id);

      res
        .status(200)
        .json(
          successResponse(
            "User deleted successfully",
            "User and all connections deleted successfully"
          )
        );
    } catch (error) {
      next(error); // Pass error to the error-handling middleware
    }
  }

  async updatePermissions(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { permissions } = req.body; // Expect an object with permission keys and boolean values

    try {
      const updatedUser = await userService.updatePermissions(
        userId,
        permissions
      );

      res
        .status(200)
        .json(successResponse(updatedUser, "Permissions updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update permissions"));
    }
  }
}

export const userController = new UserController();
