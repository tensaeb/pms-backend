// src/controllers/branch.controller.ts
import { Request, Response } from "express";
import { branchService } from "../services/branch.service";
import { successResponse, errorResponse } from "../utils/apiResponse";

class BranchController {
  async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;
      if (!loggedInUserId) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }
      const branch = await branchService.createBranch(req.body, loggedInUserId);
      res
        .status(201)
        .json(successResponse(branch, "Branch created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create branch"));
    }
  }

  async getAllBranches(req: Request, res: Response): Promise<void> {
    try {
      const branches = await branchService.getAllBranches();
      res
        .status(200)
        .json(successResponse(branches, "Branches fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch branches"));
    }
  }

  async getBranchById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const branch = await branchService.getBranchById(id);

      if (!branch) {
        res.status(404).json(errorResponse("Branch not found"));
        return;
      }

      res
        .status(200)
        .json(successResponse(branch, "Branch fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch branch"));
    }
  }

  async updateBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedBranch = await branchService.updateBranch(id, req.body);

      if (!updatedBranch) {
        res.status(404).json(errorResponse("Branch not found"));
        return;
      }

      res
        .status(200)
        .json(successResponse(updatedBranch, "Branch updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update branch"));
    }
  }

  async deleteBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deletedBranch = await branchService.deleteBranch(id);

      if (!deletedBranch) {
        res.status(404).json(errorResponse("Branch not found"));
        return;
      }

      res
        .status(200)
        .json(successResponse(deletedBranch, "Branch deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete branch"));
    }
  }
}

export const branchController = new BranchController();
