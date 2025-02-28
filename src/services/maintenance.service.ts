import { Maintenance } from "../models/maintenance.model";
import { IMaintenance } from "../interfaces/maintenance.interface";
import { User } from "../models/user.model";
import * as fs from "fs";
import * as path from "path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Parser } from "json2csv";
import sharp from "sharp";
import { propertyService } from "../services/property.services";
import { PropertyStatus, isPropertyStatus } from "../utils/typeCheckers";
import { Property } from "../models/property.model";
import logger from "../utils/logger"; // Import logger
import mongoose, { Types } from "mongoose";

class MaintenanceService {
  private readonly UPLOAD_DIR = path.join(
    process.cwd(),
    "uploads",
    "maintenance"
  );

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

  public async processImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedFilePaths: string[] = [];
    try {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const imagePath = path.join(this.UPLOAD_DIR, fileName);

        // Resize and save the image
        await sharp(file.path).resize(800).toFile(imagePath);

        // Remove the original uploaded file
        fs.unlinkSync(file.path);

        // Add the URL of the processed file to the array
        processedFilePaths.push(`/uploads/maintenance/${fileName}`);
        logger.info(`Processed image: ${imagePath}`);
      }

      return processedFilePaths;
    } catch (error) {
      logger.error(`Error processing images: ${error}`);
      throw error;
    }
  }

  public async createMaintenanceRequest(
    maintenanceData: Partial<IMaintenance>,
    requestedFiles?: Express.Multer.File[]
  ): Promise<IMaintenance> {
    try {
      const {
        tenant,
        property,
        typeOfRequest,
        description,
        urgencyLevel,
        preferredAccessTimes,
        priorityLevel,
        notes,
      } = maintenanceData;

      const checkProperty = await Property.findById(property);

      if (!checkProperty) {
        logger.warn(`Property with ID ${property} not found.`);
        throw new Error("Property not found");
      }

      const newMaintenance = new Maintenance({
        tenant,
        property,
        typeOfRequest,
        description,
        urgencyLevel,
        preferredAccessTimes,
        priorityLevel,
        notes,
      });

      if (requestedFiles && requestedFiles.length > 0) {
        const processedFileUrls = await this.processImages(requestedFiles);
        newMaintenance.requestedFiles = processedFileUrls;
      }

      const savedMaintenance = await newMaintenance.save();
      logger.info(
        `Maintenance request created with ID: ${savedMaintenance._id}`
      );
      return savedMaintenance;
    } catch (error) {
      logger.error(`Error creating maintenance request: ${error}`);
      throw error;
    }
  }

  // Approve a maintenance request
  public async approveMaintenanceRequest(
    id: string
  ): Promise<IMaintenance | null> {
    try {
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        id,
        {
          status: "Approved",
          approvalStatus: "Approved",
        },
        { new: true }
      );

      if (!updatedMaintenance) {
        logger.warn(`Maintenance request with ID ${id} not found.`);
        throw new Error("Maintenance request not found");
      }

      logger.info(`Maintenance request ${id} approved.`);
      return updatedMaintenance;
    } catch (error) {
      logger.error(`Error approving maintenance request ${id}: ${error}`);
      throw error;
    }
  }
  // Function to assign maintainer
  public async assignMaintainer(
    id: string,
    maintainerIds: string[], // Changed to array
    scheduledDate?: Date,
    estimatedCompletionTime?: Date
  ): Promise<IMaintenance | null> {
    try {
      const maintenance = await Maintenance.findById(id).populate("property");

      if (!maintenance || !maintenance.property) {
        logger.warn(
          `Maintenance request with ID ${id} not found or has no linked property.`
        );
        throw new Error(
          "Maintenance request not found or has no linked property"
        );
      }

      const propertyId = (maintenance.property as any)._id.toString();

      // Check if originalPropertyStatus is valid, or default to "open"
      let originalPropertyStatus: PropertyStatus = "open";
      if (
        maintenance.originalPropertyStatus &&
        isPropertyStatus(maintenance.originalPropertyStatus)
      ) {
        originalPropertyStatus = maintenance.originalPropertyStatus;
      }

      await propertyService.updatePropertyStatus(
        propertyId,
        "under maintenance"
      );
      logger.info(
        `Property ${propertyId} status updated to 'under maintenance' for maintenance request ${id}.`
      );

      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        id,
        {
          assignedMaintainer: maintainerIds, // Assign the array
          status: "In Progress",
          scheduledDate: scheduledDate,
          estimatedCompletionTime: estimatedCompletionTime,
          originalPropertyStatus, // Store original property status
        },
        { new: true }
      ).populate("assignedMaintainer");

      if (!updatedMaintenance) {
        // revert property status back
        await propertyService.updatePropertyStatus(
          propertyId,
          originalPropertyStatus
        );
        logger.warn(
          `Reverted property ${propertyId} status to ${originalPropertyStatus} due to error assigning maintainer to maintenance request ${id}.`
        );
        throw new Error("Maintenance request not found");
      }

      logger.info(
        `Maintenance request ${id} assigned to maintainers ${maintainerIds.join(
          ", "
        )}.` // Log all assigned maintainers.
      );
      return updatedMaintenance;
    } catch (error) {
      logger.error(
        `Error assigning maintainer to maintenance request ${id}: ${error}`
      );
      throw error;
    }
  }

  // Function to get all maintenances assigned to a maintainer
  public async getMaintenancesByMaintainer(
    maintainerId: string
  ): Promise<IMaintenance[]> {
    try {
      const maintenances = await Maintenance.find({
        assignedMaintainer: { $in: [maintainerId] }, // Find if the maintainerId is in the array.
      })
        .populate("tenant")
        .populate("property")
        .populate("assignedMaintainer");
      logger.info(
        `Retrieved maintenance requests assigned to maintainer ${maintainerId}.`
      );
      return maintenances;
    } catch (error) {
      logger.error(
        `Error getting maintenance requests assigned to maintainer ${maintainerId}: ${error}`
      );
      throw error;
    }
  }

  // New function: Get completed maintenance requests with optional maintainer ID
  public async getCompletedMaintenances(
    maintainerId?: string
  ): Promise<IMaintenance[]> {
    try {
      const query: any = { status: "Completed" };
      if (maintainerId) {
        query.assignedMaintainer = maintainerId;
      }
      const maintenances = await Maintenance.find(query)
        .populate("tenant")
        .populate("property")
        .populate("assignedMaintainer");
      logger.info(
        `Retrieved completed maintenance requests (maintainer ID: ${
          maintainerId || "all"
        }).`
      );
      return maintenances;
    } catch (error) {
      logger.error(`Error getting completed maintenance requests: ${error}`);
      throw error;
    }
  }

  // Function to get all users with a maintainer role
  public async getMaintainersList(): Promise<any[]> {
    try {
      const maintainers = await User.find({ role: "Maintainer" });
      logger.info("Retrieved list of maintainers.");
      return maintainers;
    } catch (error) {
      logger.error(`Error getting list of maintainers: ${error}`);
      throw error;
    }
  }
  // Function for maintainer to submit expenses
  public async submitMaintenanceExpense(
    id: string,
    expenseData: {
      laborCost?: number;
      equipmentCost?: { quantity: number; pricePerUnit: number }[];
      description?: string;
    }
  ): Promise<IMaintenance | null> {
    try {
      let totalExpenses = 0;

      // Calculate the total for each equipment cost item before updating
      if (expenseData.equipmentCost) {
        expenseData.equipmentCost = expenseData.equipmentCost.map((item) => {
          const total = item.quantity * item.pricePerUnit;
          totalExpenses += total;
          return {
            ...item,
            total: total,
          };
        });
      }

      //Add labor cost to total expenses
      if (expenseData.laborCost) {
        totalExpenses += expenseData.laborCost;
      }
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        id,
        {
          expense: expenseData,
          status: "Completed",
          totalExpenses: totalExpenses,
        },
        { new: true }
      );

      if (!updatedMaintenance) {
        logger.warn(`Maintenance request with ID ${id} not found.`);
        throw new Error("Maintenance request not found");
      }
      logger.info(`Maintenance request ${id} expenses submitted.`);
      return updatedMaintenance;
    } catch (error) {
      logger.error(
        `Error submitting expenses for maintenance request ${id}: ${error}`
      );
      throw error;
    }
  }

  // Function for inspector to inspect and mark as inspected
  public async inspectMaintenance(
    id: string,
    {
      inspectedBy,
      inspectedFiles,
      feedback,
    }: {
      inspectedBy: string;
      inspectedFiles?: Express.Multer.File[];
      feedback?: string;
    }
  ): Promise<IMaintenance | null> {
    try {
      const maintenance = await Maintenance.findById(id).populate("property");

      if (!maintenance || !maintenance.property) {
        logger.warn(
          `Maintenance request with ID ${id} not found or has no linked property.`
        );
        throw new Error(
          "Maintenance request not found or has no linked property"
        );
      }

      const property = maintenance.property as any;

      if (!property._id) {
        logger.error(`Property with ID ${id} has no _id field`);
        throw new Error("Property does not have an _id field");
      }

      const propertyId = property._id.toString();

      // Ensure a default value for originalPropertyStatus.
      let originalPropertyStatus: PropertyStatus = "open";
      if (
        maintenance.originalPropertyStatus &&
        isPropertyStatus(maintenance.originalPropertyStatus)
      ) {
        originalPropertyStatus = maintenance.originalPropertyStatus;
      }

      await propertyService.updatePropertyStatus(
        propertyId,
        originalPropertyStatus
      );
      logger.info(
        `Property ${propertyId} status updated to ${originalPropertyStatus} after inspection of maintenance request ${id}.`
      );

      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        id,
        {
          status: "Inspected",
          inspectedBy,
          inspectionDate: Date.now(),
          feedback,
        },
        { new: true }
      );

      if (!updatedMaintenance) {
        // Revert back in case the inspection fails
        await propertyService.updatePropertyStatus(propertyId, "open");
        logger.warn(
          `Reverted property ${propertyId} status to 'open' due to error during inspection of maintenance request ${id}.`
        );
        throw new Error("Maintenance request not found");
      }

      if (inspectedFiles && inspectedFiles.length > 0) {
        const processedFileUrls = await this.processImages(inspectedFiles);
        updatedMaintenance.inspectedFiles = processedFileUrls;
        await updatedMaintenance.save();
        logger.info(
          `Processed and saved inspected files for maintenance request ${id}.`
        );
      }

      logger.info(`Maintenance request ${id} inspected by ${inspectedBy}.`);
      return updatedMaintenance;
    } catch (error) {
      logger.error(`Error inspecting maintenance request ${id}: ${error}`);
      throw error;
    }
  }

  // Get all maintenance requests with pagination and search
  public async getAllMaintenanceRequests(query: any): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    try {
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

      logger.info(
        `Retrieved ${maintenanceRequests.length} maintenance requests (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total requests: ${totalMaintenanceRequests}`
      );

      return {
        maintenanceRequests,
        totalPages: Math.ceil(totalMaintenanceRequests / limit),
        currentPage: Number(page),
        totalMaintenanceRequests,
      };
    } catch (error) {
      logger.error(`Error getting all maintenance requests: ${error}`);
      throw error;
    }
  }

  // Get a single maintenance request by ID
  public async getMaintenanceById(id: string): Promise<IMaintenance | null> {
    try {
      const maintenance = await Maintenance.findById(id)
        .populate("tenant")
        .populate("property")
        .populate("assignedMaintainer");

      if (!maintenance) {
        logger.warn(`Maintenance request with ID ${id} not found.`);
        return null;
      }

      logger.info(`Retrieved maintenance request with ID: ${id}`);
      return maintenance;
    } catch (error) {
      logger.error(`Error getting maintenance request by ID ${id}: ${error}`);
      throw error;
    }
  }

  // Update a maintenance request by ID
  public async updateMaintenance(
    id: string,
    updateData: Partial<IMaintenance>
  ): Promise<IMaintenance | null> {
    try {
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedMaintenance) {
        logger.warn(`Maintenance request with ID ${id} not found for update.`);
        throw new Error("Maintenance request not found");
      }

      logger.info(`Maintenance request ${id} updated successfully.`);
      return updatedMaintenance;
    } catch (error) {
      logger.error(`Error updating maintenance request ${id}: ${error}`);
      throw error;
    }
  }

  // Delete a maintenance request by ID
  public async deleteMaintenance(id: string): Promise<IMaintenance | null> {
    try {
      const deletedMaintenance = await Maintenance.findByIdAndDelete(id);
      if (!deletedMaintenance) {
        logger.warn(
          `Maintenance request with ID ${id} not found for deletion.`
        );
        return null;
      }

      logger.info(`Maintenance request ${id} deleted successfully.`);
      return deletedMaintenance;
    } catch (error) {
      logger.error(`Error deleting maintenance request ${id}: ${error}`);
      throw error;
    }
  }
  public async getMaintenanceRequestsByRegisteredUser(
    registeredBy: string,
    query: any
  ): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      // First, find all users registered by this ID
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      const searchQuery: any = {
        tenant: { $in: registeredUserIds },
      };

      console.log("Search Query: ", searchQuery);

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
        .populate("assignedMaintainer")
        .populate("inspectedBy")
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const totalMaintenanceRequests = await Maintenance.countDocuments(
        searchQuery
      );
      logger.info(
        `Retrieved maintenance requests created by users registered by ${registeredBy} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total requests: ${totalMaintenanceRequests}`
      );
      return {
        maintenanceRequests,
        totalPages: Math.ceil(totalMaintenanceRequests / limit),
        currentPage: Number(page),
        totalMaintenanceRequests,
      };
    } catch (error) {
      logger.error(
        `Error getting maintenance requests created by users registered by ${registeredBy}: ${error}`
      );
      throw error;
    }
  }

  // Generate maintenance report with CSV and Word export
  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{
    csvPath: string;
    wordPath: string;
    maintenanceRequests: IMaintenance[];
  }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Fetch maintenance requests within the date range
      const maintenanceRequests: IMaintenance[] = await Maintenance.find({
        createdAt: { $gte: start, $lte: end },
      })
        .populate("tenant")
        .populate("property")
        .lean();

      if (!maintenanceRequests || maintenanceRequests.length === 0) {
        logger.warn(
          `No maintenance requests found for the given date range: ${startDate} - ${endDate}`
        );
        throw new Error(
          "No maintenance requests found for the given date range"
        );
      }

      // Ensure that the 'reports' directory exists
      const reportsDir = path.join(__dirname, "..", "..", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
      }

      // Create a timestamp for the report filenames
      const timestamp = Date.now();

      // Prepare data for CSV
      const cleanedRequests = maintenanceRequests.map((request) => ({
        tenantName: (request.tenant as any)?.tenantName,
        propertyTitle: (request.property as any)?.title,
        typeOfRequest: request.typeOfRequest,
        urgencyLevel: request.urgencyLevel,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      }));

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(cleanedRequests);

      // Write CSV report
      const csvFilePath = `${reportsDir}/maintenance_report_${timestamp}.csv`;
      fs.writeFileSync(csvFilePath, csv);
      logger.info(`Generated CSV maintenance report: ${csvFilePath}`);

      // Generate Word report
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: cleanedRequests.flatMap((request) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Tenant: ${request.tenantName}`,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({ text: `Property: ${request.propertyTitle}` }),
              new Paragraph({
                text: `Type of Request: ${request.typeOfRequest}`,
              }),
              new Paragraph({ text: `Urgency Level: ${request.urgencyLevel}` }),
              new Paragraph({ text: `Status: ${request.status}` }),
              new Paragraph({ text: `Created At: ${request.createdAt}` }),
              new Paragraph({ text: `Updated At: ${request.updatedAt}` }),
              new Paragraph({
                children: [new TextRun("\n-------------------------------\n")],
              }),
            ]),
          },
        ],
      });

      const wordFilePath = `${reportsDir}/maintenance_report_${timestamp}.docx`;
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(wordFilePath, buffer);
      logger.info(`Generated Word maintenance report: ${wordFilePath}`);

      // Return file paths and maintenance requests
      return {
        csvPath: csvFilePath,
        wordPath: wordFilePath,
        maintenanceRequests,
      };
    } catch (error) {
      logger.error(`Error generating maintenance report: ${error}`);
      throw error;
    }
  }

  // *** ADD THIS METHOD ***
  public async getMaintenancesByAssignedMaintainer(
    assignedMaintainer: string,
    query: any
  ): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;

      const searchQuery: any = {
        assignedMaintainer: assignedMaintainer,
      };

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

      logger.info(
        `Retrieved ${maintenanceRequests.length} maintenance requests for assignedMaintainer ${assignedMaintainer} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total requests: ${totalMaintenanceRequests}`
      );

      return {
        maintenanceRequests,
        totalPages: Math.ceil(totalMaintenanceRequests / limit),
        currentPage: Number(page),
        totalMaintenanceRequests,
      };
    } catch (error) {
      logger.error(
        `Error getting maintenance requests for assignedMaintainer ${assignedMaintainer}: ${error}`
      );
      throw error;
    }
  }
  // *** ADD THIS METHOD ***
  public async getMaintenancesByTenantId(
    tenantId: string,
    query: any
  ): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;

      const searchQuery: any = {
        tenant: tenantId,
      };

      if (search) {
        searchQuery.$or = [
          { "property.name": { $regex: search, $options: "i" } },
          { typeOfRequest: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }, // Add description search
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      const maintenanceRequests = await Maintenance.find(searchQuery)
        .populate("property")
        .populate("tenant")
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const totalMaintenanceRequests = await Maintenance.countDocuments(
        searchQuery
      );

      logger.info(
        `Retrieved ${maintenanceRequests.length} maintenance requests for tenant ${tenantId} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total requests: ${totalMaintenanceRequests}`
      );

      return {
        maintenanceRequests,
        totalPages: Math.ceil(totalMaintenanceRequests / limit),
        currentPage: Number(page),
        totalMaintenanceRequests,
      };
    } catch (error) {
      logger.error(
        `Error getting maintenance requests for tenant ${tenantId}: ${error}`
      );
      throw error;
    }
  }
  // *** ADD THIS METHOD ***
  public async getMaintenancesByRegisteredByAdmin(
    registeredByAdmin: string,
    query: any
  ): Promise<{
    maintenanceRequests: Partial<IMaintenance>[];
    totalPages: number;
    currentPage: number;
    totalMaintenanceRequests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      const parsedLimit = Number(limit);
      const skip = (page - 1) * parsedLimit;

      // First, find all users registered by this admin
      const registeredUsers = await User.find({
        registeredByAdmin: registeredByAdmin,
      });

      const registeredUserIds = registeredUsers.map((user) => user._id);

      //If no users are registered by the admin, return empty
      if (registeredUserIds.length === 0) {
        logger.info(
          `No users registered by admin ${registeredByAdmin}. Returning empty results.`
        );
        return {
          maintenanceRequests: [],
          totalPages: 0,
          currentPage: Number(page),
          totalMaintenanceRequests: 0,
        };
      }

      const searchQuery: any = {
        tenant: registeredUserIds,
      };
      console.log("Search Query: ", searchQuery);

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
        .skip(skip)
        .limit(parsedLimit);

      const totalMaintenanceRequests = await Maintenance.countDocuments(
        searchQuery
      );

      logger.info(
        `Retrieved maintenance requests created by users registered by admin ${registeredByAdmin} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total requests: ${totalMaintenanceRequests}`
      );

      return {
        maintenanceRequests,
        totalPages: Math.ceil(totalMaintenanceRequests / parsedLimit),
        currentPage: Number(page),
        totalMaintenanceRequests,
      };
    } catch (error) {
      logger.error(
        `Error getting maintenance requests created by users registered by admin ${registeredByAdmin}: ${error}`
      );
      throw error;
    }
  }

  // NEW METHOD: Get maintenance status counts by registeredBy with date range
  public async getMaintenanceStatusCountsByRegisteredBy(
    registeredBy: string
  ): Promise<{
    statusCounts: { [status: string]: number };
    scheduledFromNow: number;
    scheduledThisWeek: number;
    scheduledThisMonth: number;
    scheduledThisYear: number;
  }> {
    try {
      const { ObjectId } = mongoose.Types;
      // First, find all users registered by this ID
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      const statusCounts: { [status: string]: number } = {
        Pending: 0,
        Approved: 0,
        "In Progress": 0,
        Completed: 0,
        Cancelled: 0,
        Inspected: 0,
        Incomplete: 0,
      };

      //Base match query
      const baseMatchQuery = {
        tenant: { $in: registeredUserIds },
      };

      const aggregationResult = await Maintenance.aggregate([
        {
          $match: baseMatchQuery,
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
      aggregationResult.forEach((item) => {
        statusCounts[item.status] = item.count;
      });

      // Function to build the date range match query for scheduledDate
      const buildDateRangeMatchQuery = (startDate: Date): any => ({
        ...baseMatchQuery,
        scheduledDate: { $gte: startDate },
      });

      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the week (Sunday)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
      const startOfYear = new Date(now.getFullYear(), 0, 1); // Start of the year

      // Count of scheduled maintenance requests from now
      const scheduledFromNow = await Maintenance.countDocuments(
        buildDateRangeMatchQuery(new Date())
      );
      // Count of scheduled maintenance requests this week
      const scheduledThisWeek = await Maintenance.countDocuments(
        buildDateRangeMatchQuery(startOfWeek)
      );
      // Count of scheduled maintenance requests this month
      const scheduledThisMonth = await Maintenance.countDocuments(
        buildDateRangeMatchQuery(startOfMonth)
      );
      // Count of scheduled maintenance requests this year
      const scheduledThisYear = await Maintenance.countDocuments(
        buildDateRangeMatchQuery(startOfYear)
      );

      logger.info(
        `Retrieved maintenance status counts and schedule counts for registeredBy: ${registeredBy}`
      );

      return {
        statusCounts,
        scheduledFromNow,
        scheduledThisWeek,
        scheduledThisMonth,
        scheduledThisYear,
      };
    } catch (error: any) {
      logger.error(
        `Error getting maintenance status counts by registeredBy: ${error}`
      );
      throw error;
    }
  }

  public async getTotalExpensesByRegisteredBy(registeredBy: string): Promise<{
    maintenances: { _id: string; totalExpenses: number }[];
    totalOfTotalExpenses: number;
  }> {
    try {
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      const maintenances = await Maintenance.aggregate([
        {
          $match: {
            tenant: { $in: registeredUserIds },
          },
        },
        {
          $addFields: {
            equipmentCostTotal: {
              $ifNull: [
                {
                  $reduce: {
                    input: "$expense.equipmentCost",
                    initialValue: 0,
                    in: { $add: ["$$value", { $ifNull: ["$$this.total", 0] }] },
                  },
                },
                0,
              ],
            },
            laborCostValue: { $ifNull: ["$expense.laborCost", 0] },
          },
        },
        {
          $addFields: {
            calculatedTotalExpenses: {
              $add: ["$equipmentCostTotal", "$laborCostValue"],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            calculatedTotalExpenses: { $first: "$calculatedTotalExpenses" }, // Get the totalExpenses
          },
        },
        {
          $project: {
            _id: 1,
            calculatedTotalExpenses: 1,
          },
        },
      ]);

      const totalOfTotalExpenses = maintenances.reduce(
        (sum, maintenance) => sum + (maintenance.calculatedTotalExpenses || 0),
        0
      );

      logger.info(
        `Calculated total expenses for maintenances registered by ${registeredBy}`
      );

      return {
        maintenances: maintenances.map((m) => ({
          _id: m._id,
          totalExpenses: m.calculatedTotalExpenses || 0,
        })),
        totalOfTotalExpenses: totalOfTotalExpenses,
      };
    } catch (error: any) {
      logger.error(
        `Error getting total expenses for maintenances registered by ${registeredBy}: ${error}`
      );
      throw error;
    }
  }

  public async getTotalExpensesByRegisteredByAdmin(
    registeredByAdmin: string
  ): Promise<{
    maintenances: { _id: string; totalExpenses: number }[];
    totalOfTotalExpenses: number;
  }> {
    try {
      // Find all users registered by this admin
      const registeredUsers = await User.find({
        registeredByAdmin: registeredByAdmin,
      });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      // If no users are registered by the admin, return empty results
      if (registeredUserIds.length === 0) {
        logger.info(
          `No users registered by admin ${registeredByAdmin}. Returning empty results.`
        );
        return {
          maintenances: [],
          totalOfTotalExpenses: 0,
        };
      }

      const maintenances = await Maintenance.aggregate([
        {
          $match: {
            tenant: { $in: registeredUserIds },
          },
        },
        {
          $addFields: {
            equipmentCostTotal: {
              $ifNull: [
                {
                  $reduce: {
                    input: "$expense.equipmentCost",
                    initialValue: 0,
                    in: { $add: ["$$value", { $ifNull: ["$$this.total", 0] }] },
                  },
                },
                0,
              ],
            },
            laborCostValue: { $ifNull: ["$expense.laborCost", 0] },
          },
        },
        {
          $addFields: {
            calculatedTotalExpenses: {
              $add: ["$equipmentCostTotal", "$laborCostValue"],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            calculatedTotalExpenses: { $first: "$calculatedTotalExpenses" }, // Get the totalExpenses
          },
        },
        {
          $project: {
            _id: 1,
            calculatedTotalExpenses: 1,
          },
        },
      ]);

      const totalOfTotalExpenses = maintenances.reduce(
        (sum, maintenance) => sum + (maintenance.calculatedTotalExpenses || 0),
        0
      );

      logger.info(
        `Calculated total expenses for maintenances registered by admin ${registeredByAdmin}`
      );

      return {
        maintenances: maintenances.map((m) => ({
          _id: m._id,
          totalExpenses: m.calculatedTotalExpenses || 0,
        })),
        totalOfTotalExpenses: totalOfTotalExpenses,
      };
    } catch (error: any) {
      logger.error(
        `Error getting total expenses for maintenances registered by admin ${registeredByAdmin}: ${error}`
      );
      throw error;
    }
  }
}

export const maintenanceService = new MaintenanceService();
