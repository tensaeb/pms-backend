import { Clearance } from "../models/clearance.model";
import { IClearance } from "../interfaces/clearance.interface";
import { Property } from "../models/property.model"; // Import the Property model

class ClearanceService {
  public async createClearance(
    clearanceData: Partial<IClearance>
  ): Promise<IClearance> {
    const { tenant, property, moveOutDate, notes } = clearanceData;
    const newClearance = new Clearance({
      tenant,
      property,
      moveOutDate,
      notes,
    });
    return await newClearance.save();
  }

  public async getAllClearances(query: any): Promise<{
    clearances: Partial<IClearance>[];
    totalPages: number;
    currentPage: number;
    totalClearances: number;
  }> {
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
    return {
      clearances,
      totalPages: Math.ceil(totalClearances / limit),
      currentPage: Number(page),
      totalClearances,
    };
  }

  public async getClearanceById(id: string): Promise<IClearance | null> {
    return await Clearance.findById(id)
      .populate("tenant")
      .populate("property")
      .populate("approvedBy")
      .populate("inspectionBy");
  }

  public async approveClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    const updatedClearance = await Clearance.findByIdAndUpdate(
      id,
      { status: "Approved", approvedBy: userId },
      { new: true }
    )
      .populate("approvedBy")
      .populate("property");

    if (!updatedClearance) {
      throw new Error("Clearance request not found");
    }

    // Update Property status to "Open" if clearance is approved
    if (updatedClearance.status === "Approved" && updatedClearance.property) {
      await Property.findByIdAndUpdate(
        updatedClearance.property.id,
        { status: "open" },
        { new: true }
      );
    }

    return updatedClearance;
  }
  public async inspectClearance(
    id: string,
    userId: string,
    feedback: string
  ): Promise<IClearance | null> {
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
      throw new Error("Clearance request not found");
    }
    return updatedClearance;
  }
  public async rejectClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    const updatedClearance = await Clearance.findByIdAndUpdate(
      id,
      { status: "Rejected", approvedBy: userId },
      { new: true }
    ).populate("approvedBy");

    if (!updatedClearance) {
      throw new Error("Clearance request not found");
    }
    return updatedClearance;
  }

  public async updateClearance(
    id: string,
    updateData: Partial<IClearance>
  ): Promise<IClearance | null> {
    const updatedClearance = await Clearance.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedClearance) {
      throw new Error("Clearance request not found");
    }
    return updatedClearance;
  }

  public async deleteClearance(id: string): Promise<IClearance | null> {
    return await Clearance.findByIdAndDelete(id);
  }
  public async getClearancesByInspectedUser(
    userId: string
  ): Promise<IClearance[]> {
    return await Clearance.find({ inspectionBy: userId })
      .populate("tenant")
      .populate("property");
  }
  public async getUninspectedClearances(): Promise<IClearance[]> {
    return await Clearance.find({ inspectionBy: { $exists: false } })
      .populate("tenant")
      .populate("property");
  }
}

export const clearanceService = new ClearanceService();
