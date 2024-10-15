import { Request, Response } from "express";

import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";
import { tenantService } from "../services/tenant.services";

class TenantController {
  public async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const newTenant = await tenantService.createTenant(req.body, files);
      res
        .status(201)
        .json(successResponse(newTenant, "Tenant created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create tenant"));
    }
  }

  public async getAllTenants(req: Request, res: Response): Promise<void> {
    try {
      const tenants = await tenantService.getAllTenants(req.query);
      res
        .status(200)
        .json(successResponse(tenants, "Tenants fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch tenants"));
    }
  }

  public async getTenantById(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.getTenantById(req.params.id);
      if (!tenant) {
        res.status(404).json(errorResponse("Tenant not found"));
      }
      res
        .status(200)
        .json(successResponse(tenant, "Tenant fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch tenant"));
    }
  }

  public async updateTenant(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const updatedTenant = await tenantService.updateTenant(
        req.params.id,
        req.body,
        files
      );
      res
        .status(200)
        .json(successResponse(updatedTenant, "Tenant updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update tenant"));
    }
  }

  public async deleteTenant(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.deleteTenant(req.params.id);
      res
        .status(200)
        .json(successResponse(tenant, "Tenant deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete tenant"));
    }
  }
}

export const tenantController = new TenantController();
