import { ILease } from "../interfaces/lease.interface";
import { Lease } from "../models/lease.model";
import fs from "fs";
import path from "path";

class LeaseService {
  public async createLease(
    leaseData: Partial<ILease>,
    files?: Express.Multer.File[]
  ): Promise<ILease> {
    const newLease = new Lease(leaseData);

    if (files && files.length > 0) {
      newLease.documents = files.map((file) => file.filename);
    }

    return await newLease.save();
  }

  public async getAllLeases(query: any): Promise<{
    leases: Partial<ILease>[];
    totalPages: number;
    currentPage: number;
    totalLeases: number;
  }> {
    const { page = 1, limit = 5, search = "" } = query;

    const searchQuery: any = {
      $or: [
        { "paymentTerms.paymentMethod": { $regex: search, $options: "i" } },
        { rulesAndConditions: { $regex: search, $options: "i" } },
      ],
    };

    const leases = await Lease.find(searchQuery)
      .populate("tenant")
      .populate("property")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalLeases = await Lease.countDocuments(searchQuery);

    return {
      leases,
      totalPages: Math.ceil(totalLeases / limit),
      currentPage: Number(page),
      totalLeases,
    };
  }

  public async getLeaseById(id: string): Promise<ILease | null> {
    return await Lease.findById(id).populate("tenant").populate("property");
  }

  public async updateLease(
    id: string,
    updateData: Partial<ILease>,
    files?: Express.Multer.File[]
  ) {
    if (files && files.length > 0) {
      updateData.documents = files.map((file) => file.filename);
    }

    const updatedLease = await Lease.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedLease) {
      throw new Error("Lease not found");
    }

    return updatedLease;
  }

  public async deleteLease(id: string): Promise<ILease | null> {
    const lease = await Lease.findByIdAndDelete(id);
    if (lease && lease.documents && lease.documents.length > 0) {
      lease.documents.forEach((doc) => {
        fs.unlinkSync(doc);
      });
    }
    return lease;
  }

  public async downloadLeaseDocument(fileName: string): Promise<string> {
    const fullPath = path.join(__dirname, "..", "..", "uploads", fileName);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found");
    }

    return fullPath;
  }
}

export const leaseService = new LeaseService();
