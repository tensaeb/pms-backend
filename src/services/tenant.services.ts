import { ITenant } from "../interfaces/tenant.interface";
import { Tenant } from "../models/tenant.model";
import fs from "fs";

class TenantService {
  public async createTenant(
    tenantData: Partial<ITenant>,
    files?: Express.Multer.File[]
  ): Promise<ITenant> {
    const newTenant = new Tenant(tenantData);

    if (files && files.length > 0) {
      newTenant.idProof = files.map((file) => file.filename);
    }

    return await newTenant.save();
  }

  public async getAllTenants(query: any): Promise<{
    tenants: Partial<ITenant>[];
    totalPages: number;
    currentPage: number;
    totalTenants: number;
  }> {
    const { page = 1, limit = 5, search = "" } = query;

    const searchQuery: any = {
      tenantName: { $regex: search, $options: "i" },
    };

    const tenants = await Tenant.find(searchQuery)
      .populate("propertyInformation.propertyId")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalTenants = await Tenant.countDocuments(searchQuery);

    return {
      tenants,
      totalPages: Math.ceil(totalTenants / limit),
      currentPage: Number(page),
      totalTenants,
    };
  }

  public async getTenantById(id: string): Promise<ITenant | null> {
    return await Tenant.findById(id).populate("propertyInformation.propertyId");
  }

  public async updateTenant(
    id: string,
    updateData: Partial<ITenant>,
    files?: Express.Multer.File[]
  ) {
    if (files && files.length > 0) {
      updateData.idProof = files.map((file) => file.filename);
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedTenant) {
      throw new Error("Tenant not found");
    }

    return updatedTenant;
  }

  public async deleteTenant(id: string): Promise<ITenant | null> {
    const tenant = await Tenant.findByIdAndDelete(id);
    if (tenant && tenant.idProof && tenant.idProof.length > 0) {
      tenant.idProof.forEach((proof) => {
        fs.unlinkSync(proof);
      });
    }
    return tenant;
  }
}

export const tenantService = new TenantService();
