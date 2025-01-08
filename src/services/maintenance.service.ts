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
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  public async processImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedFilePaths: string[] = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const imagePath = path.join(this.UPLOAD_DIR, fileName);

      // Resize and save the image
      await sharp(file.path).resize(800).toFile(imagePath);

      // Remove the original uploaded file
      fs.unlinkSync(file.path);

      // Add the URL of the processed file to the array
      processedFilePaths.push(`/uploads/maintenance/${fileName}`);
    }

    return processedFilePaths;
  }

  public async createMaintenanceRequest(
    maintenanceData: Partial<IMaintenance>,
    requestedFiles?: Express.Multer.File[]
  ): Promise<IMaintenance> {
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

    return await newMaintenance.save();
  }

  // Approve a maintenance request
  public async approveMaintenanceRequest(
    id: string
  ): Promise<IMaintenance | null> {
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        approvalStatus: "Approved",
      },
      { new: true }
    );

    if (!updatedMaintenance) {
      throw new Error("Maintenance request not found");
    }
    return updatedMaintenance;
  }
  // Function to assign maintainer
  public async assignMaintainer(
    id: string,
    maintainerId: string,
    scheduledDate?: Date,
    estimatedCompletionTime?: Date
  ): Promise<IMaintenance | null> {
    const maintenance = await Maintenance.findById(id);

    if (!maintenance || !maintenance.property) {
      throw new Error(
        "Maintenance request not found or has not linked property"
      );
    }

    //Convert the id to string as this is how your property database UUID is stored.
    const propertyId = maintenance.property.toString();

    // Check if originalPropertyStatus is valid, or default to "open"
    let originalPropertyStatus: PropertyStatus = "open";
    if (
      maintenance.originalPropertyStatus &&
      isPropertyStatus(maintenance.originalPropertyStatus)
    ) {
      originalPropertyStatus = maintenance.originalPropertyStatus;
    }

    await propertyService.updatePropertyStatus(
      propertyId, // Pass the ID as string.
      "under maintenance"
    );

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      {
        assignedMaintainer: maintainerId,
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

      throw new Error("Maintenance request not found");
    }

    return updatedMaintenance;
  }

  // Function to get all maintenances assigned to a maintainer
  public async getMaintenancesByMaintainer(
    maintainerId: string
  ): Promise<IMaintenance[]> {
    return await Maintenance.find({ assignedMaintainer: maintainerId })
      .populate("tenant")
      .populate("property")
      .populate("assignedMaintainer");
  }

  // New function: Get completed maintenance requests with optional maintainer ID
  public async getCompletedMaintenances(
    maintainerId?: string
  ): Promise<IMaintenance[]> {
    const query: any = { status: "Completed" };
    if (maintainerId) {
      query.assignedMaintainer = maintainerId;
    }
    return await Maintenance.find(query)
      .populate("tenant")
      .populate("property")
      .populate("assignedMaintainer");
  }

  // Function to get all users with a maintainer role
  public async getMaintainersList(): Promise<any[]> {
    return await User.find({ role: "Maintainer" });
  }
  // Function for maintainer to submit expenses
  public async submitMaintenanceExpense(
    id: string,
    expense: number
  ): Promise<IMaintenance | null> {
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      { expense: expense, status: "Completed" },
      { new: true }
    );

    if (!updatedMaintenance) {
      throw new Error("Maintenance request not found");
    }
    return updatedMaintenance;
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
    const maintenance = await Maintenance.findById(id).populate("property");
    if (!maintenance || !maintenance.property) {
      throw new Error(
        "Maintenance request not found or has no linked property"
      );
    }

    //Convert the id to string as this is how your property database UUID is stored.
    const property = maintenance.property.toString();

    // Ensure a default value for originalPropertyStatus.
    let originalPropertyStatus: PropertyStatus = "open";
    if (
      maintenance.originalPropertyStatus &&
      isPropertyStatus(maintenance.originalPropertyStatus)
    ) {
      originalPropertyStatus = maintenance.originalPropertyStatus;
    }

    await propertyService.updatePropertyStatus(
      property,
      originalPropertyStatus
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
      //Revert back in case the inspection fails
      await propertyService.updatePropertyStatus(property, "open");
      throw new Error("Maintenance request not found");
    }

    if (inspectedFiles && inspectedFiles.length > 0) {
      const processedFileUrls = await this.processImages(inspectedFiles);
      updatedMaintenance.inspectedFiles = processedFileUrls;
      await updatedMaintenance.save(); // Ensure the files are saved in the database
    }

    return updatedMaintenance;
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
      .populate("property")
      .populate("assignedMaintainer");
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

  // Generate maintenance report with CSV and Word export
  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{
    csvPath: string;
    wordPath: string;
    maintenanceRequests: IMaintenance[];
  }> {
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
      throw new Error("No maintenance requests found for the given date range");
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

    // Return file paths and maintenance requests
    return {
      csvPath: csvFilePath,
      wordPath: wordFilePath,
      maintenanceRequests,
    };
  }
}

export const maintenanceService = new MaintenanceService();
