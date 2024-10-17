import { Maintenance } from "../models/maintenance.model";
import { IMaintenance } from "../interfaces/maintenance.interface";

import * as fs from "fs";
import * as path from "path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Parser } from "json2csv";

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
