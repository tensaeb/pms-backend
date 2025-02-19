import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { clearanceService } from "../services/clearance.service";
import mongoose from "mongoose";

class ClearanceController {
  public async createClearance(req: Request, res: Response): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;
      const newClearance = await clearanceService.createClearance(
        {
          ...req.body,
        },
        loggedInUserId
      );
      res
        .status(201)
        .json(
          successResponse(
            newClearance,
            "Clearance request created successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to create clearance request")
        );
    }
  }

  public async getAllClearances(req: Request, res: Response): Promise<void> {
    try {
      const clearances = await clearanceService.getAllClearances(req.query);
      res
        .status(200)
        .json(
          successResponse(clearances, "Clearance requests fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch clearance requests")
        );
    }
  }

  public async getClearanceById(req: Request, res: Response): Promise<void> {
    try {
      const clearance = await clearanceService.getClearanceById(req.params.id);
      if (!clearance) {
        res.status(404).json(errorResponse("Clearance request not found"));
        return;
      }
      res
        .status(200)
        .json(
          successResponse(clearance, "Clearance request fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch clearance request")
        );
    }
  }
  public async approveClearance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !user.id) {
        res.status(400).json(errorResponse("User ID is required"));
        return;
      }

      const updatedClearance = await clearanceService.approveClearance(
        req.params.id,
        user.id
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedClearance,
            "Clearance request approved successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to approve clearance request")
        );
    }
  }
  public async inspectClearance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { feedback } = req.body;
      if (!user || !user.id) {
        res.status(400).json(errorResponse("User ID is required"));
        return;
      }

      const updatedClearance = await clearanceService.inspectClearance(
        req.params.id,
        user.id,
        feedback
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedClearance,
            "Clearance request inspected successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to inspect clearance request")
        );
    }
  }

  public async rejectClearance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !user.id) {
        res.status(400).json(errorResponse("User ID is required"));
        return;
      }
      const updatedClearance = await clearanceService.rejectClearance(
        req.params.id,
        user.id
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedClearance,
            "Clearance request rejected successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to reject clearance request")
        );
    }
  }
  public async getClearancesByInspectedUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const clearances = await clearanceService.getClearancesByInspectedUser(
        req.params.userId
      );
      res
        .status(200)
        .json(
          successResponse(
            clearances,
            "Clearances for the user fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch clearances for the user"
          )
        );
    }
  }

  public async updateClearance(req: Request, res: Response): Promise<void> {
    try {
      const updatedClearance = await clearanceService.updateClearance(
        req.params.id,
        req.body
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedClearance,
            "Clearance request updated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to update clearance request")
        );
    }
  }

  public async deleteClearance(req: Request, res: Response): Promise<void> {
    try {
      const clearance = await clearanceService.deleteClearance(req.params.id);
      res
        .status(200)
        .json(
          successResponse(clearance, "Clearance request deleted successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to delete clearance request")
        );
    }
  }
  public async getUninspectedClearances(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const clearances = await clearanceService.getUninspectedClearances();
      res
        .status(200)
        .json(
          successResponse(
            clearances,
            "Uninspected clearances fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch uninspected clearances")
        );
    }
  }
  // *** REMAINS FROM PREVIOUS STEPS ***
  public async getClearancesByTenantId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { tenantId } = req.params;
      const clearances = await clearanceService.getClearancesByTenantId(
        tenantId,
        req.query
      );

      res
        .status(200)
        .json(
          successResponse(
            clearances,
            "Clearance requests for the tenant fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch clearance requests for the tenant"
          )
        );
    }
  }
  // NEW METHOD: Get clearance status counts by registeredBy
  public async getClearanceStatusCounts(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const { clearanceStatusCounts, inspectionStatusCounts } =
        await clearanceService.getClearanceStatusCountsByRegisteredBy(
          registeredBy
        );

      res
        .status(200)
        .json(
          successResponse(
            { clearanceStatusCounts, inspectionStatusCounts },
            "Clearance and inspection status counts fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch clearance and inspection status counts"
          )
        );
    }
  }
  // *** REMAINS FROM PREVIOUS STEPS ***
  public async getClearancesByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const clearances = await clearanceService.getClearancesByRegisteredBy(
        registeredBy,
        req.query
      );

      res
        .status(200)
        .json(
          successResponse(
            clearances,
            "Clearance requests for the registeredBy fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch clearance requests for the registeredBy"
          )
        );
    }
  }
  public async getClearancesByRegisteredByAdmin(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredByAdmin } = req.params;
      const clearances =
        await clearanceService.getClearancesByRegisteredByAdmin(
          registeredByAdmin,
          req.query
        );

      res
        .status(200)
        .json(
          successResponse(
            clearances,
            "Clearance requests for the registeredByAdmin fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch clearance requests for the registeredByAdmin"
          )
        );
    }
  }
}

export const clearanceController = new ClearanceController();
