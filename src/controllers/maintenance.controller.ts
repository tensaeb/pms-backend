// maintenance.controller.ts
import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { maintenanceService } from "../services/maintenance.service";

class MaintenanceController {
  // Create a new maintenance request
  public async createMaintenanceRequest(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user;

      if (!user || user.role !== "Tenant") {
        res
          .status(403)
          .json(
            errorResponse(
              "Unauthorized: Only tenants can create maintenance requests"
            )
          );
        return;
      }

      const uploadedFiles = req.files as Express.Multer.File[];

      const newMaintenance = await maintenanceService.createMaintenanceRequest(
        {
          ...req.body,
          tenant: user,
        },
        uploadedFiles
      );

      res
        .status(201)
        .json(
          successResponse(
            newMaintenance,
            "Maintenance request created successfully"
          )
        );

      return;
    } catch (error: any) {
      console.error("Error creating maintenance request:", error);
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to create maintenance request")
        );
    }
  }

  // Approve maintenance request
  public async approveMaintenanceRequest(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const updatedMaintenance =
        await maintenanceService.approveMaintenanceRequest(req.params.id);
      res
        .status(200)
        .json(
          successResponse(
            updatedMaintenance,
            "Maintenance request approved and scheduled successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to approve maintenance request")
        );
    }
  }

  // Assign a maintainer to a maintenance request
  public async assignMaintainer(req: Request, res: Response): Promise<void> {
    try {
      const { maintainerId, scheduledDate, estimatedCompletionTime } = req.body;
      const { id } = req.params;

      // Validate input
      if (!id || !maintainerId) {
        res
          .status(400)
          .json(
            errorResponse("Maintenance ID and Maintainer ID are required.")
          );
        return;
      }

      if (scheduledDate && new Date(scheduledDate) <= new Date()) {
        res
          .status(400)
          .json(errorResponse("Scheduled date must be in the future."));
        return;
      }

      if (estimatedCompletionTime && Number(estimatedCompletionTime) <= 0) {
        res
          .status(400)
          .json(
            errorResponse("Estimated completion time must be greater than 0.")
          );
        return;
      }

      const updatedMaintenance = await maintenanceService.assignMaintainer(
        id,
        maintainerId,
        scheduledDate,
        estimatedCompletionTime
      );

      res
        .status(200)
        .json(
          successResponse(
            updatedMaintenance,
            "Maintenance request assigned to maintainer successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to assign maintainer"));
    }
  }

  // Get completed maintenance requests with an optional maintainer ID
  public async getCompletedMaintenances(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { maintainerId } = req.params;
      const completedMaintenances =
        await maintenanceService.getCompletedMaintenances(maintainerId);
      res
        .status(200)
        .json(
          successResponse(
            completedMaintenances,
            "Completed maintenances fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch completed maintenances")
        );
    }
  }

  // Get all maintenance requests assigned to a maintainer
  public async getMaintenancesByMaintainer(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { maintainerId } = req.params;
      const maintenances = await maintenanceService.getMaintenancesByMaintainer(
        maintainerId
      );
      res
        .status(200)
        .json(
          successResponse(
            maintenances,
            "Maintenances for the maintainer fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch maintenances for the maintainer"
          )
        );
    }
  }
  // Get list of maintainers
  public async getMaintainersList(req: Request, res: Response): Promise<void> {
    try {
      const maintainers = await maintenanceService.getMaintainersList();
      res
        .status(200)
        .json(successResponse(maintainers, "Maintainers fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch maintainers"));
    }
  }
  // Maintainer submits maintenance expense
  public async submitMaintenanceExpense(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const expenseData = req.body;
      const updatedMaintenance =
        await maintenanceService.submitMaintenanceExpense(
          req.params.id,
          expenseData
        );
      res
        .status(200)
        .json(
          successResponse(
            updatedMaintenance,
            "Maintenance expense submitted successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to submit maintenance expense")
        );
    }
  }

  // Inspector Inspects Maintenance and mark as inspected
  public async inspectMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const maintenanceId = req.params.id;
      const uploadedFiles = req.files as Express.Multer.File[];
      const { feedback } = req.body;

      if (!user || !user.id) {
        res.status(400).json(errorResponse("User ID is required"));
        return;
      }

      const updatedMaintenance = await maintenanceService.inspectMaintenance(
        maintenanceId,
        {
          inspectedBy: user.id,
          inspectedFiles: uploadedFiles,
          feedback,
        }
      );

      res
        .status(200)
        .json(
          successResponse(
            updatedMaintenance,
            "Maintenance inspected successfully"
          )
        );
    } catch (error: any) {
      console.error("Error inspecting maintenance:", error);
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to inspect maintenance"));
    }
  }

  // Get all maintenance requests with pagination and search
  public async getAllMaintenanceRequests(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const maintenanceRequests =
        await maintenanceService.getAllMaintenanceRequests(req.query);

      res
        .status(200)
        .json(
          successResponse(
            maintenanceRequests,
            "Maintenance requests fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch maintenance requests")
        );
    }
  }

  // Get a maintenance request by ID
  public async getMaintenanceById(req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceService.getMaintenanceById(
        req.params.id
      );
      if (!maintenance) {
        res.status(404).json(errorResponse("Maintenance request not found"));
      }
      res
        .status(200)
        .json(
          successResponse(
            maintenance,
            "Maintenance request fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch maintenance request")
        );
    }
  }

  // Update a maintenance request by ID
  public async updateMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const updatedMaintenance = await maintenanceService.updateMaintenance(
        req.params.id,
        req.body
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedMaintenance,
            "Maintenance request updated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to update maintenance request")
        );
    }
  }

  // Delete a maintenance request by ID
  public async deleteMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceService.deleteMaintenance(
        req.params.id
      );
      res
        .status(200)
        .json(
          successResponse(
            maintenance,
            "Maintenance request deleted successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to delete maintenance request")
        );
    }
  }
  public async getMaintenanceRequestsByRegisteredUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const maintenanceRequests =
        await maintenanceService.getMaintenanceRequestsByRegisteredUser(
          req.params.userId,
          req.query
        );

      res
        .status(200)
        .json(
          successResponse(
            maintenanceRequests,
            "Maintenances for the registered user fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch maintenances for the registered user"
          )
        );
    }
  }

  public async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Validate startDate and endDate
      if (!startDate || !endDate) {
        res
          .status(400)
          .json({ message: "Start date and end date are required" });
        return;
      }

      // Generate the report and get file paths along with the maintenance requests
      const { csvPath, wordPath, maintenanceRequests } =
        await maintenanceService.generateReport(
          startDate as string,
          endDate as string
        );

      // Return the file paths and the maintenance requests data in the response
      res.status(200).json({
        message: "Report generated successfully",
        data: {
          files: {
            csv: csvPath,
            word: wordPath,
          },
          maintenanceRequests, // Return the maintenance requests data in the response
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to generate report", error: error.message });
    }
  }
}

export const maintenanceController = new MaintenanceController();
