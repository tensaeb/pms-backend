import { Clearance } from "../models/clearance.model";
import { IClearance } from "../interfaces/clearance.interface";
import { Property } from "../models/property.model"; // Import the Property model
import logger from "../utils/logger";
import { Tenant } from "../models/tenant.model";

class ClearanceService {
  public async createClearance(
    clearanceData: Partial<IClearance>
  ): Promise<IClearance> {
    logger.info(
      `ClearanceService: createClearance called with data: ${JSON.stringify(
        clearanceData
      )}`
    );
    try {
      const { tenant, property, moveOutDate, notes } = clearanceData;
      const newClearance = new Clearance({
        tenant,
        property,
        moveOutDate,
        notes,
      });

      await Tenant.findById(newClearance.tenant.id, {
        status: "pending",
      });

      const savedClearance = await newClearance.save();
      logger.info(
        `ClearanceService: createClearance - Clearance created successfully: ${savedClearance.id}`
      );
      return savedClearance;
    } catch (error) {
      logger.error(`ClearanceService: createClearance failed`, error);
      throw error;
    }
  }

  public async getAllClearances(query: any): Promise<{
    clearances: Partial<IClearance>[];
    totalPages: number;
    currentPage: number;
    totalClearances: number;
  }> {
    logger.info(
      `ClearanceService: getAllClearances called with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      let searchQuery: any = {};
      if (search) {
        searchQuery.$or = [
          { "tenant.name": { $regex: search, $options: "i" } },
          { "property.name": { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      const clearances = await Clearance.find(searchQuery)
        .populate("tenant")
        .populate("property")
        .skip((page - 1) * limit)
        .limit(Number(limit));
      const totalClearances = await Clearance.countDocuments(searchQuery);
      logger.info(
        `ClearanceService: getAllClearances - Fetched ${clearances.length} clearances, total: ${totalClearances}`
      );
      return {
        clearances,
        totalPages: Math.ceil(totalClearances / limit),
        currentPage: Number(page),
        totalClearances,
      };
    } catch (error) {
      logger.error(`ClearanceService: getAllClearances failed`, error);
      throw error;
    }
  }

  public async getClearanceById(id: string): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: getClearanceById called for clearanceId: ${id}`
    );
    try {
      const clearance = await Clearance.findById(id)
        .populate("tenant")
        .populate("property")
        .populate("approvedBy")
        .populate("inspectionBy");
      if (!clearance) {
        logger.error(
          `ClearanceService: getClearanceById - Clearance with ID ${id} not found`
        );
      }
      logger.info(
        `ClearanceService: getClearanceById - Fetched clearance with ID ${id}`
      );
      return clearance;
    } catch (error) {
      logger.error(
        `ClearanceService: getClearanceById failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }

  public async approveClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: approveClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        { status: "Approved", approvedBy: userId },
        { new: true }
      )
        .populate("approvedBy")
        .populate("property");

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: approveClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }

      // Update Property status to "Open" if clearance is approved
      if (updatedClearance.status === "Approved" && updatedClearance.property) {
        await Property.findByIdAndUpdate(
          updatedClearance.property.id,
          { status: "open" },
          { new: true }
        );

        await Tenant.findById(updatedClearance.tenant.id, {
          status: "inactive",
        });
        logger.info(
          `ClearanceService: approveClearance - Updated property status to Open for clearanceId: ${id}`
        );
      }
      logger.info(
        `ClearanceService: approveClearance - Clearance approved for clearanceId: ${id} by userId: ${userId}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: approveClearance failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }
  public async inspectClearance(
    id: string,
    userId: string,
    feedback: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: inspectClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        {
          inspectionStatus: "Passed",
          inspectionBy: userId,
          inspectionDate: Date.now(),
          feedback: feedback,
        },
        { new: true }
      ).populate("inspectionBy");

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: inspectClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: inspectClearance - Clearance inspected for clearanceId: ${id} by userId: ${userId}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: inspectClearance failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }
  public async rejectClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: rejectClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        { status: "Rejected", approvedBy: userId },
        { new: true }
      ).populate("approvedBy");

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: rejectClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: rejectClearance - Clearance rejected for clearanceId: ${id} by userId: ${userId}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: rejectClearance failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }

  public async updateClearance(
    id: string,
    updateData: Partial<IClearance>
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: updateClearance called for clearanceId: ${id} with data ${JSON.stringify(
        updateData
      )}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedClearance) {
        logger.error(
          `ClearanceService: updateClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: updateClearance - Clearance updated successfully for clearanceId: ${id}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: updateClearance failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }

  public async deleteClearance(id: string): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: deleteClearance called for clearanceId: ${id}`
    );
    try {
      const clearance = await Clearance.findByIdAndDelete(id);
      if (!clearance) {
        logger.error(
          `ClearanceService: deleteClearance - Clearance with ID ${id} not found`
        );
      }
      logger.info(
        `ClearanceService: deleteClearance - Deleted clearance with ID ${id}`
      );
      return clearance;
    } catch (error) {
      logger.error(
        `ClearanceService: deleteClearance failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }
  public async getClearancesByInspectedUser(
    userId: string
  ): Promise<IClearance[]> {
    logger.info(
      `ClearanceService: getClearancesByInspectedUser called for userId: ${userId}`
    );
    try {
      const clearances = await Clearance.find({ inspectionBy: userId })
        .populate("tenant")
        .populate("property");
      logger.info(
        `ClearanceService: getClearancesByInspectedUser - Fetched ${clearances.length} clearances for userId: ${userId}`
      );
      return clearances;
    } catch (error) {
      logger.error(
        `ClearanceService: getClearancesByInspectedUser failed for userId ${userId}`,
        error
      );
      throw error;
    }
  }
  public async getUninspectedClearances(): Promise<IClearance[]> {
    logger.info(`ClearanceService: getUninspectedClearances called`);
    try {
      const clearances = await Clearance.find({
        inspectionBy: { $exists: false },
      })
        .populate("tenant")
        .populate("property");
      logger.info(
        `ClearanceService: getUninspectedClearances - Fetched ${clearances.length} uninspected clearances`
      );
      return clearances;
    } catch (error) {
      logger.error(`ClearanceService: getUninspectedClearances failed`, error);
      throw error;
    }
  }
}

export const clearanceService = new ClearanceService();
