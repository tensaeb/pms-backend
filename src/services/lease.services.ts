import { ILease } from "../interfaces/lease.interface";
import { Lease } from "../models/lease.model";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ITenant } from "../interfaces/tenant.interface";
import { IProperty } from "../interfaces/property.interface";
import { DecodedToken } from "../middlewares/authMiddleware";
import { User } from "../models/user.model";

class LeaseService {
  public async createLease(
    leaseData: Partial<ILease>,
    files?: Express.Multer.File[],
    user?: string | undefined
  ): Promise<ILease> {
    const newLease = new Lease({ ...leaseData, user: user });

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
    const { page = 1, limit = 10, search = "" } = query;

    const searchQuery: any = {
      $or: [
        { "paymentTerms.paymentMethod": { $regex: search, $options: "i" } },
        { rulesAndConditions: { $regex: search, $options: "i" } },
      ],
    };

    const leases = await Lease.find(searchQuery)
      .populate("user")
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
    return await Lease.findById(id)
      .populate("user")
      .populate("tenant")
      .populate("property");
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

  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{ csvPath: string; wordPath: string; leases: ILease[] }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch leases within the date range
    const leases: ILease[] = await Lease.find({
      createdAt: { $gte: start, $lte: end },
    })
      .populate("tenant")
      .populate("property")
      .lean();

    if (!leases || leases.length === 0) {
      throw new Error("No leases found for the given date range");
    }

    // Ensure that the 'reports' directory exists
    const reportsDir = path.join(__dirname, "..", "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Create a timestamp for the report filenames
    const timestamp = Date.now();

    // Prepare data for CSV
    const cleanedLeases = leases.map((lease) => ({
      tenantName: (lease.tenant as ITenant)?.tenantName,
      propertyTitle: (lease.property as IProperty)?.title,
      leaseStart: lease.leaseStart,
      leaseEnd: lease.leaseEnd,
      rentAmount: lease.rentAmount,
      paymentMethod: lease.paymentTerms.paymentMethod,
      rulesAndConditions: lease.rulesAndConditions || "",
      additionalOccupants: lease.additionalOccupants?.join(", ") || "",
      utilitiesAndServices: lease.utilitiesAndServices || "",
      createdAt: lease.createdAt,
      updatedAt: lease.updatedAt,
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(cleanedLeases);

    // Write CSV report
    const csvFilePath = `${reportsDir}/leases-report-${timestamp}.csv`;
    fs.writeFileSync(csvFilePath, csv);

    // Generate Word report
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanedLeases.flatMap((lease) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tenant: ${lease.tenantName}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: `Property: ${lease.propertyTitle}` }),
            new Paragraph({ text: `Lease Start: ${lease.leaseStart}` }),
            new Paragraph({ text: `Lease End: ${lease.leaseEnd}` }),
            new Paragraph({ text: `Rent Amount: $${lease.rentAmount}` }),
            new Paragraph({ text: `Payment Method: ${lease.paymentMethod}` }),
            new Paragraph({
              text: `Rules & Conditions: ${lease.rulesAndConditions}`,
            }),
            new Paragraph({
              text: `Additional Occupants: ${lease.additionalOccupants}`,
            }),
            new Paragraph({
              text: `Utilities & Services: ${lease.utilitiesAndServices}`,
            }),
            new Paragraph({ text: `Created At: ${lease.createdAt}` }),
            new Paragraph({ text: `Updated At: ${lease.updatedAt}` }),
            new Paragraph({
              children: [new TextRun("\n-------------------------------\n")],
            }),
          ]),
        },
      ],
    });

    const wordFilePath = `${reportsDir}/leases-report-${timestamp}.docx`;
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(wordFilePath, buffer);

    // Return file paths and leases
    return { csvPath: csvFilePath, wordPath: wordFilePath, leases };
  }

  public async getLeasesByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    leases: Partial<ILease>[];
    totalPages: number;
    currentPage: number;
    totalLeases: number;
  }> {
    const { page = 1, limit = 10, search = "" } = query;

    // First find all users registered by this ID
    const registeredUsers = await User.find({ registeredBy: registeredBy });
    const registeredUserIds = registeredUsers.map((user) => user._id);

    // Build the search query
    const searchQuery: any = {
      user: { $in: registeredUserIds },
    };

    const leases = await Lease.find(searchQuery)
      .populate({
        path: "user",
        select: "registeredBy",
      })
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
}

export const leaseService = new LeaseService();
