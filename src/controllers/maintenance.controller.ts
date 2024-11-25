import { Request, Response } from "express";

import { errorResponse, successResponse } from "../utils/apiResponse";
import { maintenanceService } from "../services/maintenance.service";

class MaintenanceController {
  // Create a new maintenance request
  public async createMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      // Access the uploaded files and extract file paths
      const uploadedFiles = req.files as Express.Multer.File[];

      // Extract the file paths to store in the database
      // const filePaths = uploadedFiles.map((file) => file.path);

      // Create maintenance request, including file paths
      const newMaintenance = await maintenanceService.createMaintenance({
        ...req.body,
        user: user,
        photosOrVideos: uploadedFiles, // Store the paths, not the entire file object
      });

      res
        .status(201)
        .json(
          successResponse(
            newMaintenance,
            "Maintenance request created successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to create maintenance request")
        );
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
