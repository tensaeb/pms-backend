import express, { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { leaseService } from "../services/lease.services";
import { User } from "../models/user.model";

class LeaseController {
  public async createLease(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user?.id;
      const files = req.files as Express.Multer.File[];
      const newLease = await leaseService.createLease(req.body, files, user);

      // Check if the email already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        res.status(400).json({ message: "Email already exists" });
      }

      if (!user) {
        res.status(400).json({ message: "User not authorized" });
      }

      res
        .status(201)
        .json(successResponse(newLease, "Lease created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create lease"));
    }
  }

  public async getAllLeases(req: Request, res: Response): Promise<void> {
    try {
      const leases = await leaseService.getAllLeases(req.query);
      res
        .status(200)
        .json(successResponse(leases, "Leases fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch leases"));
    }
  }

  public async getLeaseById(req: Request, res: Response): Promise<void> {
    try {
      const lease = await leaseService.getLeaseById(req.params.id);
      if (!lease) {
        res.status(404).json(errorResponse("Lease not found"));
      }
      res
        .status(200)
        .json(successResponse(lease, "Lease fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch lease"));
    }
  }

  public async updateLease(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const updatedLease = await leaseService.updateLease(
        req.params.id,
        req.body,
        files
      );
      res
        .status(200)
        .json(successResponse(updatedLease, "Lease updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update lease"));
    }
  }

  public async deleteLease(req: Request, res: Response): Promise<void> {
    try {
      const lease = await leaseService.deleteLease(req.params.id);
      res
        .status(200)
        .json(successResponse(lease, "Lease deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete lease"));
    }
  }

  public async downloadLeaseDocument(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const filePath = req.params.file; // Get file name from request
      const fullPath = await leaseService.downloadLeaseDocument(filePath);

      res.download(fullPath, (err) => {
        if (err) {
          res.status(404).json(errorResponse("File not found", err.message));
        }
      });
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse("Error downloading document", error.message));
    }
  }

  public async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Validate startDate and endDate
      if (!startDate || !endDate) {
        res
          .status(400)
          .json(errorResponse("Start date and end date are required"));
        return;
      }

      // Generate the report and get file paths along with the leases
      const { csvPath, wordPath, leases } = await leaseService.generateReport(
        startDate as string,
        endDate as string
      );

      // Return the file paths and the leases data in the response
      res.status(200).json({
        message: "Report generated successfully",
        data: {
          files: {
            csv: csvPath,
            word: wordPath,
          },
          leases, // Return the leases data in the response
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to generate report"));
    }
  }

  public async getLeasesByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const leases = await leaseService.getLeasesByRegisteredBy(
        registeredBy,
        query
      );
      res
        .status(200)
        .json(successResponse(leases, "leases fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch leases"));
    }
  }
  // NEW METHOD: Get lease status counts by registeredBy
  public async getLeaseStatusCounts(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const statusCounts =
        await leaseService.getLeaseStatusCountsByRegisteredBy(registeredBy);

      res
        .status(200)
        .json(
          successResponse(
            statusCounts,
            "Lease status counts fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch lease status counts")
        );
    }
  }
}

export const leaseController = new LeaseController();
