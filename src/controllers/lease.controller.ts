import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { leaseService } from "../services/lease.services";

class LeaseController {
  public async createLease(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const newLease = await leaseService.createLease(req.body, files);
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
}

export const leaseController = new LeaseController();
