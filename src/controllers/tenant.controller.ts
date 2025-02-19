import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../utils/apiResponse";
import { tenantService } from "../services/tenant.services";

class TenantController {
  public async createTenant(req: Request, res: Response): Promise<void> {
    try {
      // Correctly access files from multer fields
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const idProofFiles = files["idProof"] || [];
      const user = req.user;
      const tenantData = req.body;

      // Pass the idProof files to the service
      const newTenant = await tenantService.createTenant(
        tenantData,
        idProofFiles,
        user!.id
      );

      res
        .status(201)
        .json(
          successResponse(newTenant, "Tenant and user created successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create tenant and user"));
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
      const files = req.files as Express.Multer.File[] | undefined;
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
  public async updateTenantUserPhoto(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const file = req.file as Express.Multer.File;
      const updatedUser = await tenantService.updateTenantUserPhoto(
        req.params.id,
        file
      );
      res
        .status(200)
        .json(
          successResponse(updatedUser, "Tenant user photo updated successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to update tenant user photo")
        );
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

  // public async generateReport(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { startDate, endDate } = req.query;

  //     // Validate startDate and endDate
  //     if (!startDate || !endDate) {
  //       res
  //         .status(400)
  //         .json(errorResponse("Start date and end date are required"));
  //       return;
  //     }

  //     // Generate the report and get file paths along with the tenants
  //     const { csvPath, wordPath, tenants } = await tenantService.generateReport(
  //       startDate as string,
  //       endDate as string
  //     );

  //     // Return the file paths and the tenants data in the response
  //     res.status(200).json({
  //       message: "Tenant report generated successfully",
  //       data: {
  //         files: {
  //           csv: csvPath,
  //           word: wordPath,
  //         },
  //         tenants, // Return the tenants data in the response
  //       },
  //     });
  //   } catch (error: any) {
  //     res
  //       .status(500)
  //       .json(errorResponse(error.message, "Failed to generate tenant report"));
  //   }
  // }

  public async getTenantsByUserAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { registeredBy } = req.params;
      const tenants = await tenantService.getTenantsByUserAdmin(
        registeredBy,
        req.query
      );

      res
        .status(201)
        .json(successResponse(tenants, "Tenants fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch tenant from admin ")
        );
    }
  }
  // NEW METHOD: Get tenant status counts by registeredByAdmin
  public async getTenantStatusCounts(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredByAdmin } = req.params;
      const statusCounts =
        await tenantService.getTenantStatusCountsByRegisteredByAdmin(
          registeredByAdmin
        );

      res
        .status(200)
        .json(
          successResponse(
            statusCounts,
            "Tenant status counts fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch tenant status counts")
        );
    }
  }
}

export const tenantController = new TenantController();
