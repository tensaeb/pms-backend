import { RentInvoice } from "../models/rentInvoice.model";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";

class RentInvoiceService {
  // Create a new rent invoice
  public async createRentInvoice(
    rentInvoiceData: Partial<IRentInvoice>
  ): Promise<IRentInvoice> {
    const newRentInvoice = new RentInvoice(rentInvoiceData);
    return await newRentInvoice.save();
  }

  // Get all rent invoices with pagination and search
  public async getAllRentInvoices(query: any): Promise<{
    rentInvoices: Partial<IRentInvoice>[];
    totalPages: number;
    currentPage: number;
    totalRentInvoices: number;
  }> {
    const { page = 1, limit = 10, search = "", paymentStatus } = query;

    let searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { "tenant.name": { $regex: search, $options: "i" } },
        { "property.name": { $regex: search, $options: "i" } },
      ];
    }

    if (paymentStatus) {
      searchQuery.paymentStatus = paymentStatus;
    }

    const rentInvoices = await RentInvoice.find(searchQuery)
      .populate("tenant")
      .populate("property")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalRentInvoices = await RentInvoice.countDocuments(searchQuery);

    return {
      rentInvoices,
      totalPages: Math.ceil(totalRentInvoices / limit),
      currentPage: Number(page),
      totalRentInvoices,
    };
  }

  // Get a single rent invoice by ID
  public async getRentInvoiceById(id: string): Promise<IRentInvoice | null> {
    return await RentInvoice.findById(id)
      .populate("tenant")
      .populate("property");
  }

  // Update a rent invoice by ID
  public async updateRentInvoice(
    id: string,
    updateData: Partial<IRentInvoice>
  ): Promise<IRentInvoice | null> {
    const updatedRentInvoice = await RentInvoice.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      }
    );
    if (!updatedRentInvoice) {
      throw new Error("Rent Invoice not found");
    }
    return updatedRentInvoice;
  }

  // Delete a rent invoice by ID
  public async deleteRentInvoice(id: string): Promise<IRentInvoice | null> {
    return await RentInvoice.findByIdAndDelete(id);
  }
}

export const rentInvoiceService = new RentInvoiceService();
