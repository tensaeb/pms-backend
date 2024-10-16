import { Maintenance } from "../models/maintenance.model";
import { IMaintenance } from "../interfaces/maintenance.interface";

class MaintenanceService {
  // Create a new maintenance request
  public async createMaintenance(
    maintenanceData: Partial<IMaintenance>
  ): Promise<IMaintenance> {
    const newMaintenance = new Maintenance(maintenanceData);
    return await newMaintenance.save();
  }

  // Get all maintenance requests with pagination and search
  public async getAllMaintenanceRequests(query: any): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    const { page = 1, limit = 10, search = "", status } = query;

    let searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { "tenant.name": { $regex: search, $options: "i" } },
        { "property.name": { $regex: search, $options: "i" } },
        { typeOfRequest: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      searchQuery.status = status;
    }

    const maintenanceRequests = await Maintenance.find(searchQuery)
      .populate("tenant")
      .populate("property")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalMaintenanceRequests = await Maintenance.countDocuments(
      searchQuery
    );

    return {
      maintenanceRequests,
      totalPages: Math.ceil(totalMaintenanceRequests / limit),
      currentPage: Number(page),
      totalMaintenanceRequests,
    };
  }

  // Get a single maintenance request by ID
  public async getMaintenanceById(id: string): Promise<IMaintenance | null> {
    return await Maintenance.findById(id)
      .populate("tenant")
      .populate("property");
  }

  // Update a maintenance request by ID
  public async updateMaintenance(
    id: string,
    updateData: Partial<IMaintenance>
  ): Promise<IMaintenance | null> {
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      }
    );
    if (!updatedMaintenance) {
      throw new Error("Maintenance request not found");
    }
    return updatedMaintenance;
  }

  // Delete a maintenance request by ID
  public async deleteMaintenance(id: string): Promise<IMaintenance | null> {
    return await Maintenance.findByIdAndDelete(id);
  }
}

export const maintenanceService = new MaintenanceService();
