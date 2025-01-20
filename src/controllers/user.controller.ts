import { NextFunction, Request, Response } from "express";
import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";
import { userService } from "../services/user.services";
import path from "path";

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

  public async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
        return;
      }

      const result = await userService.resetPassword(userId, newPassword);

      res
        .status(200)
        .json(successResponse(result, "Password reset successful."));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  public async getUsersByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const users = await userService.getUsersByRegisteredBy(
        registeredBy,
        query
      );
      res
        .status(200)
        .json(successResponse(users, "Users fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch users"));
    }
  }
  public async getUserRoleUsingRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const users = await userService.getUserRoleUsingRegisteredBy(
        registeredBy,
        query
      );
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

  async getPhoto(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user || !user.photo) {
        res.status(404).json(errorResponse("Photo not found"));
        return;
      }

      res.sendFile(path.resolve(user.photo));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to retrieve photo"));
    }
  }

  public async getUsersRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;

      if (!loggedInUserId) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }

      const users = await userService.getUsersRegisteredBy(loggedInUserId);
      res
        .status(200)
        .json(successResponse(users, "Users fetched successfully"));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getUserItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }

      const items = await userService.fetchUserItems(userId); // Added await here
      res
        .status(200)
        .json(successResponse(items, "User items fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch user items"));
    }
  }

  async uploadPhoto(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json(errorResponse("No file uploaded"));
        return;
      }

      const updatedUser = await userService.updateUserPhoto(
        req.params.id,
        req.file
      );
      res
        .status(200)
        .json(successResponse(updatedUser, "Photo uploaded successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to upload photo"));
    }
  }

  // Delete user photo
  async deletePhoto(req: Request, res: Response): Promise<void> {
    try {
      const updatedUser = await userService.removeUserPhoto(req.params.id);
      res
        .status(200)
        .json(successResponse(updatedUser, "Photo deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete photo"));
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
  public async recursivelyInactiveUsers(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      await userService.recursivelyInactiveUsers(userId);
      res
        .status(200)
        .json(successResponse("", "Users and registered users made inactive"));
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to set users to inactive recursively"
          )
        );
    }
  }

  // Get maintainers by registeredBy with pagination
  public async getMaintainersByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const users = await userService.getMaintainersByRegisteredBy(
        registeredBy,
        query
      );
      res
        .status(200)
        .json(successResponse(users, "Maintainers fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch maintainers"));
    }
  }
  // Get inspectors by registeredBy with pagination
  public async getInspectorsByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const users = await userService.getInspectorsByRegisteredBy(
        registeredBy,
        query
      );
      res
        .status(200)
        .json(successResponse(users, "Inspectors fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch inspectors"));
    }
  }

  // New Controller method for status check by email
  public async getUserStatusByEmail(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { email } = req.body; // Get email from body

      if (!email) {
        res.status(400).json(errorResponse("Email is required"));
        return;
      }

      const statusData = await userService.getUserStatusByEmail(email);

      if (!statusData) {
        res.status(404).json(errorResponse("User not found"));
        return;
      }

      res
        .status(200)
        .json(successResponse(statusData, "User status fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch user status by email")
        );
    }
  }
}

export const userController = new UserController();
