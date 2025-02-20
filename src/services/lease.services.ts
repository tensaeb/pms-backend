import { ILease } from "../interfaces/lease.interface";
import { Lease } from "../models/lease.model";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ITenant } from "../interfaces/tenant.interface";
import { IProperty } from "../interfaces/property.interface";
import { Tenant } from "../models/tenant.model";
import { User } from "../models/user.model";
import { propertyService } from "./property.services";
import logger from "../utils/logger"; // Import logger
import mongoose from "mongoose";

class LeaseService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), "uploads", "lease");

  constructor() {
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) {
        fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        logger.info(`Created upload directory: ${this.UPLOAD_DIR}`);
      }
    } catch (error) {
      logger.error(`Error ensuring upload directory exists: ${error}`);
      throw error;
    }
  }

  private async processFiles(
    files: Express.Multer.File[],
    userId: string
  ): Promise<string[]> {
    try {
      const userFolder = path.join(this.UPLOAD_DIR, userId);
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
        logger.info(`Created user folder: ${userFolder}`);
      }

      const filePaths = files.map((file) => {
        const filename = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(userFolder, filename);
        fs.renameSync(file.path, filePath);
        logger.info(`Processed file: ${filePath}`);
        return `/uploads/lease/${userId}/${filename}`;
      });
      return filePaths;
    } catch (error) {
      logger.error(`Error processing files: ${error}`);
      throw error;
    }
  }
  public async createLease(
    leaseData: Partial<ILease>,
    files?: Express.Multer.File[],
    user?: string | undefined
  ): Promise<ILease> {
    const { property, tenant, leaseStart, leaseEnd } = leaseData;

    try {
      if (!property) {
        throw new Error("Property Id is required");
      }
      if (!tenant) {
        throw new Error("Tenant Id is required");
      }
      if (!leaseStart || !leaseEnd) {
        throw new Error("leaseStart and leaseEnd dates are required");
      }

      const newLease = new Lease({ ...leaseData, user: user });

      //Determine lease status based on dates
      if (newLease.leaseEnd < new Date()) {
        newLease.status = "expired";
      }
      let savedLease: ILease;

      try {
        if (files && files.length > 0) {
          if (!user) {
            throw new Error("User Id required");
          }

          const filePaths = await this.processFiles(files, user);
          newLease.documents = filePaths;
        }
        savedLease = await newLease.save();

        //1. Update property status to 'reserved'
        await propertyService.updatePropertyStatus(
          property.toString(),
          "reserved"
        );
        //2. Update tenant status to 'active'

        //3. savedLease._id to tenant's lease property
        await Tenant.findByIdAndUpdate(tenant, {
          status: "active",
          lease: savedLease._id,
        });

        logger.info(`Lease created with ID: ${savedLease._id}`);
        return savedLease;
      } catch (error) {
        // Revert status
        if (property) {
          await propertyService.updatePropertyStatus(
            property.toString(),
            "open"
          );
          logger.warn(
            `Reverted property ${property.toString()} status to 'open' due to error creating lease.`
          );
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Error creating lease: ${error}`);
      throw error;
    }
  }
  // ... rest of your methods remains the same
  public async getAllLeases(query: any): Promise<{
    leases: Partial<ILease>[];
    totalPages: number;
    currentPage: number;
    totalLeases: number;
  }> {
    try {
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
      logger.info(
        `Retrieved ${leases.length} leases (page ${page}, limit ${limit}, search "${search}"). Total leases: ${totalLeases}`
      );
      return {
        leases,
        totalPages: Math.ceil(totalLeases / limit),
        currentPage: Number(page),
        totalLeases,
      };
    } catch (error) {
      logger.error(`Error getting all leases: ${error}`);
      throw error;
    }
  }

  public async getLeaseById(id: string): Promise<ILease | null> {
    try {
      const lease = await Lease.findById(id)
        .populate("user")
        .populate("tenant")
        .populate("property");

      if (!lease) {
        logger.warn(`Lease with ID ${id} not found.`);
        return null;
      }

      logger.info(`Retrieved lease with ID: ${id}`);
      return lease;
    } catch (error) {
      logger.error(`Error getting lease by ID ${id}: ${error}`);
      throw error;
    }
  }

  public async updateLease(
    id: string,
    updateData: Partial<ILease>,
    files?: Express.Multer.File[]
  ) {
    try {
      const lease = await Lease.findById(id);

      if (!lease) {
        logger.warn(`Lease with ID ${id} not found for update.`);
        throw new Error("Lease not found");
      }
      //Check the lease status
      if (updateData.leaseEnd) {
        lease.leaseEnd = updateData.leaseEnd;
      }

      if (lease.leaseEnd < new Date()) {
        lease.status = "expired";
        //Also, update tenant status to inactive
        await Tenant.findByIdAndUpdate(lease.tenant, { status: "inactive" });
      }
      if (files && files.length > 0) {
        updateData.documents = files.map((file) => file.filename);
      }

      const updatedLease = await Lease.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      if (!updatedLease) {
        logger.warn(`Lease with ID ${id} not found for update.`);
        throw new Error("Lease not found");
      }
      logger.info(`Lease with ID ${id} updated successfully.`);
      return updatedLease;
    } catch (error) {
      logger.error(`Error updating lease ${id}: ${error}`);
      throw error;
    }
  }

  public async deleteLease(id: string): Promise<ILease | null> {
    try {
      const lease = await Lease.findByIdAndDelete(id);
      if (!lease) {
        logger.warn(`Lease with ID ${id} not found for deletion.`);
        return null;
      }
      if (lease && lease.documents && lease.documents.length > 0) {
        lease.documents.forEach((doc) => {
          fs.unlinkSync(doc);
          logger.info(`Deleted lease document: ${doc}`);
        });
      }
      logger.info(`Lease with ID ${id} deleted successfully.`);
      return lease;
    } catch (error) {
      logger.error(`Error deleting lease ${id}: ${error}`);
      throw error;
    }
  }

  public async downloadLeaseDocument(fileName: string): Promise<string> {
    try {
      const fullPath = path.join(__dirname, "..", "..", "uploads", fileName);

      // Check if the file exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`File not found: ${fullPath}`);
        throw new Error("File not found");
      }

      logger.info(`Downloading lease document: ${fullPath}`);
      return fullPath;
    } catch (error) {
      logger.error(`Error downloading lease document ${fileName}: ${error}`);
      throw error;
    }
  }

  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{ csvPath: string; wordPath: string; leases: ILease[] }> {
    try {
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
        logger.warn(
          `No leases found for the given date range: ${startDate} - ${endDate}`
        );
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
      logger.info(`Generated CSV report: ${csvFilePath}`);

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
      logger.info(`Generated Word report: ${wordFilePath}`);

      // Return file paths and leases
      return { csvPath: csvFilePath, wordPath: wordFilePath, leases };
    } catch (error) {
      logger.error(`Error generating lease report: ${error}`);
      throw error;
    }
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
    try {
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
        .populate("tenant")
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const totalLeases = await Lease.countDocuments(searchQuery);

      logger.info(
        `Retrieved leases registered by ${registeredBy} (page ${page}, limit ${limit}, search "${search}"). Total leases: ${totalLeases}`
      );

      return {
        leases,
        totalPages: Math.ceil(totalLeases / limit),
        currentPage: Number(page),
        totalLeases,
      };
    } catch (error) {
      logger.error(
        `Error getting leases registered by ${registeredBy}: ${error}`
      );
      throw error;
    }
  }

  // NEW METHOD: Get lease status counts by registeredBy
  public async getLeaseStatusCountsByRegisteredBy(
    registeredBy: string
  ): Promise<{ [status: string]: number }> {
    try {
      const { ObjectId } = mongoose.Types;

      // First find all users registered by this ID
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      const aggregationResult = await Lease.aggregate([
        {
          $match: {
            user: { $in: registeredUserIds },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
      ]);

      // Initialize status counts with default values of 0
      const statusCounts: { [status: string]: number } = {
        active: 0,
        expired: 0,
        pending: 0,
        terminated: 0,
      };

      // Update counts with the aggregation result
      aggregationResult.forEach((item) => {
        statusCounts[item.status] = item.count;
      });

      logger.info(
        `Retrieved lease status counts for registeredBy: ${registeredBy}`
      );

      return statusCounts;
    } catch (error: any) {
      logger.error(
        `Error getting lease status counts by registeredBy: ${error}`
      );
      throw error;
    }
  }
  // NEW METHOD: Function to update statuses based on lease dates
  public async updateLeaseAndTenantStatuses(): Promise<void> {
    try {
      const now = new Date();
      const leases = await Lease.find({
        leaseEnd: { $lte: now },
        status: { $ne: "expired" }, // Only expired the active lease
      }).populate("tenant"); // Ensure tenant is populated

      for (const lease of leases) {
        // Update lease status to "expired"
        lease.status = "expired";
        await lease.save();

        // Update tenant status to "inactive"
        if (
          lease.tenant &&
          typeof lease.tenant !== "string" &&
          (lease.tenant as ITenant)._id
        ) {
          await Tenant.findByIdAndUpdate((lease.tenant as ITenant)._id, {
            status: "inactive",
          });
          logger.info(
            `Tenant status updated to inactive for tenant ID ${
              (lease.tenant as ITenant)._id
            }`
          );
        }
        logger.info(
          `Lease status updated to expired for lease ID ${lease._id}`
        );
      }
    } catch (error) {
      logger.error(`Error updating lease and tenant statuses: ${error}`);
      throw error;
    }
  }
}

export const leaseService = new LeaseService();
