// src/services/branch.service.ts
import { Branch } from "../models/branch.model";
import { IBranch } from "../interfaces/branch.interface";
import logger from "../utils/logger";
import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user.model";

class BranchService {
  async createBranch(
    branchData: IBranch,
    loggedInUserId: string
  ): Promise<IBranch> {
    logger.info(
      `BranchService: createBranch called with data: ${JSON.stringify(
        branchData
      )} loggedInUserId: ${loggedInUserId}`
    );
    try {
      const loggedInUser = await User.findById(loggedInUserId);
      if (!loggedInUser) {
        logger.error("UserService: createUser - Logged in user ID is required");
        throw new Error("Logged in user ID is required");
      }

      branchData.admin = loggedInUserId as any;
      const newBranch = new Branch(branchData);
      const savedBranch = await newBranch.save();
      logger.info(
        `BranchService: createBranch - Branch created successfully: ${savedBranch.id}`
      );
      return savedBranch;
    } catch (error) {
      logger.error("BranchService: createBranch failed:", error);
      throw error;
    }
  }

  async getAllBranches(): Promise<IBranch[]> {
    logger.info("BranchService: getAllBranches called");
    try {
      const branches = await Branch.find().populate("admin");
      logger.info(
        `BranchService: getAllBranches - Fetched ${branches.length} branches`
      );
      return branches;
    } catch (error) {
      logger.error("BranchService: getAllBranches failed:", error);
      throw error;
    }
  }

  async getBranchById(id: string): Promise<IBranch | null> {
    logger.info(`BranchService: getBranchById called for branchId: ${id}`);
    try {
      const branch = await Branch.findById(id).populate("admin");
      if (!branch) {
        logger.warn(
          `BranchService: getBranchById - Branch with ID ${id} not found`
        );
        return null;
      }
      logger.info(
        `BranchService: getBranchById - Fetched branch with ID: ${branch.id}`
      );
      return branch;
    } catch (error) {
      logger.error(
        `BranchService: getBranchById failed for branchId: ${id}`,
        error
      );
      throw error;
    }
  }

  async updateBranch(id: string, updateData: IBranch): Promise<IBranch | null> {
    logger.info(
      `BranchService: updateBranch called for branchId: ${id} with data: ${JSON.stringify(
        updateData
      )}`
    );
    try {
      const updatedBranch = await Branch.findByIdAndUpdate(id, updateData, {
        new: true,
      }).populate("admin");
      if (!updatedBranch) {
        logger.warn(
          `BranchService: updateBranch - Branch with ID ${id} not found`
        );
        return null;
      }
      logger.info(
        `BranchService: updateBranch - Branch updated successfully: ${updatedBranch.id}`
      );
      return updatedBranch;
    } catch (error) {
      logger.error(
        `BranchService: updateBranch failed for branchId: ${id}`,
        error
      );
      throw error;
    }
  }

  async deleteBranch(id: string): Promise<IBranch | null> {
    logger.info(`BranchService: deleteBranch called for branchId: ${id}`);
    try {
      const deletedBranch = await Branch.findByIdAndDelete(id);
      if (!deletedBranch) {
        logger.warn(
          `BranchService: deleteBranch - Branch with ID ${id} not found`
        );
        return null;
      }
      logger.info(
        `BranchService: deleteBranch - Branch deleted successfully: ${deletedBranch.id}`
      );
      return deletedBranch;
    } catch (error) {
      logger.error(
        `BranchService: deleteBranch failed for branchId: ${id}`,
        error
      );
      throw error;
    }
  }
}

export const branchService = new BranchService();
