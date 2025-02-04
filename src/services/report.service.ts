import { IUser } from "../interfaces/user.interface";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { IProperty } from "../interfaces/property.interface";
import { ILease } from "../interfaces/lease.interface";
import { IMaintenance } from "../interfaces/maintenance.interface";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";
import { IComplaint } from "../interfaces/complaint.interface";
import logger from "../utils/logger"; // Import logger

// Define Enums directly here since they were not exported from the interfaces
enum PropertyStatus {
  Open = "open",
  Reserved = "reserved",
  Closed = "closed",
  UnderMaintenance = "under maintenance",
  Sold = "sold",
}

enum MaintenanceStatus {
  Pending = "Pending",
  Approved = "Approved",
  InProgress = "In Progress",
  Completed = "Completed",
  Cancelled = "Cancelled",
  Inspected = "Inspected",
  Incomplete = "Incomplete",
}

enum ComplaintStatus {
  Pending = "Pending",
  InProgress = "In Progress",
  Resolved = "Resolved",
  Closed = "Closed",
}

type PropertyStatusCounts = { [key in PropertyStatus | "Unknown"]: number };
type MaintenanceStatusCounts = {
  [key in MaintenanceStatus | "Unknown"]: number;
};
type ComplaintStatusCounts = { [key in ComplaintStatus | "Unknown"]: number };

class ReportService {
  private static ensureReportsDir() {
    const reportsDir = path.join(__dirname, "../../reports");
    try {
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
        logger.info(`Created reports directory: ${reportsDir}`);
      }
      return reportsDir;
    } catch (error) {
      logger.error(`Error ensuring reports directory: ${error}`);
      throw error;
    }
  }

  public async generatePropertyReport(startDate?: string, endDate?: string) {
    try {
      const properties = await this.fetchData<IProperty>(
        "Property",
        startDate,
        endDate
      );
      return this.generateReport(properties, "property");
    } catch (error) {
      logger.error(`Error generating property report: ${error}`);
      throw error;
    }
  }

  public async generateLeaseReport(startDate?: string, endDate?: string) {
    try {
      const leases = await this.fetchData<ILease>("Lease", startDate, endDate);
      return this.generateReport(leases, "lease");
    } catch (error) {
      logger.error(`Error generating lease report: ${error}`);
      throw error;
    }
  }

  public async generateMaintenanceReport(startDate?: string, endDate?: string) {
    try {
      const maintenanceRequests = await this.fetchData<IMaintenance>(
        "Maintenance",
        startDate,
        endDate
      );
      return this.generateReport(maintenanceRequests, "maintenance");
    } catch (error) {
      logger.error(`Error generating maintenance report: ${error}`);
      throw error;
    }
  }

  public async generateRentInvoiceReport(startDate?: string, endDate?: string) {
    try {
      const rentInvoices = await this.fetchData<IRentInvoice>(
        "RentInvoice",
        startDate,
        endDate
      );
      return this.generateReport(rentInvoices, "rentInvoice");
    } catch (error) {
      logger.error(`Error generating rent invoice report: ${error}`);
      throw error;
    }
  }

  public async generateUserReport(startDate?: string, endDate?: string) {
    try {
      const users = await this.fetchData<IUser>("User", startDate, endDate);
      return this.generateReport(users, "user");
    } catch (error) {
      logger.error(`Error generating user report: ${error}`);
      throw error;
    }
  }

  private async fetchData<T>(
    modelName: string,
    startDate?: string,
    endDate?: string
  ): Promise<T[]> {
    try {
      const modelPath = path.resolve(
        __dirname,
        `../models/${modelName}.model.js`
      );
      let Model;

      if (mongoose.connection.models[modelName]) {
        Model = mongoose.connection.models[modelName];
      } else {
        Model = require(modelPath).default;
      }

      let filter: any = {};
      if (startDate && endDate) {
        filter = {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        };
      }
      const data = await Model.find(filter).lean();
      logger.info(
        `Fetched ${data.length} records for ${modelName} (start date: ${startDate}, end date: ${endDate})`
      );
      return data;
    } catch (error) {
      logger.error(`Error fetching data for ${modelName}: ${error}`);
      throw error;
    }
  }

  private async generateReport<T extends Record<string, any>>(
    data: T[],
    reportType: string
  ) {
    try {
      const reportsDir = ReportService.ensureReportsDir();
      const timestamp = Date.now();

      const csvPath = path.join(reportsDir, `${reportType}-${timestamp}.csv`);
      const wordPath = path.join(reportsDir, `${reportType}-${timestamp}.docx`);

      await this.generateCSV(data, csvPath);
      await this.generateWord(data, wordPath, reportType);

      logger.info(
        `Generated ${reportType} report. CSV path: ${csvPath}, Word path: ${wordPath}`
      );
      return { csvPath, wordPath };
    } catch (error) {
      logger.error(`Error generating ${reportType} report: ${error}`);
      throw error;
    }
  }

  private async generateCSV<T extends Record<string, any>>(
    data: T[],
    filePath: string
  ) {
    try {
      const parser = new Parser();
      const csv = parser.parse(data);
      fs.writeFileSync(filePath, csv);
      logger.info(`Generated CSV file: ${filePath}`);
    } catch (error) {
      logger.error(`Error generating CSV file: ${error}`);
      throw error;
    }
  }

  private async generateWord<T extends Record<string, any>>(
    data: T[],
    filePath: string,
    reportType: string
  ) {
    try {
      let doc;
      if (reportType === "property") {
        doc = this.generateWordReportProperty(data);
      } else if (reportType === "lease") {
        doc = this.generateWordReportLease(data);
      } else if (reportType === "maintenance") {
        doc = this.generateWordReportMaintenance(data);
      } else if (reportType === "rentInvoice") {
        doc = this.generateWordReportRentInvoice(data);
      } else if (reportType === "user") {
        doc = this.generateWordReportUser(data);
      } else {
        doc = new Document({
          sections: [
            {
              children: [
                new Paragraph({ text: "Could not generate word report" }),
              ],
            },
          ],
        });
        logger.warn(`Could not generate Word report for ${reportType}`);
      }

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
      logger.info(`Generated Word file: ${filePath}`);
    } catch (error) {
      logger.error(`Error generating Word file: ${error}`);
      throw error;
    }
  }

  private generateWordReportProperty(properties: any[]): Document {
    return new Document({
      sections: [
        {
          properties: {},
          children: properties.flatMap((property) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Title: ${property.title}`, bold: true }),
              ],
            }),
            new Paragraph({ text: `Description: ${property.description}` }),
            new Paragraph({ text: `Address: ${property.address}` }),
            new Paragraph({ text: `Price: $${property.price}` }),
            new Paragraph({ text: `Rent Price: ${property.rentPrice}` }),
            new Paragraph({
              text: `Number of Units: ${property.numberOfUnits}`,
            }),
            new Paragraph({ text: `Property Type: ${property.propertyType}` }),
            new Paragraph({ text: `Floor Plan: ${property.floorPlan}` }),
            new Paragraph({
              text: `Amenities: ${property.amenities?.join(", ") || "N/A"}`,
            }),
            new Paragraph({
              text: `Photos: ${
                property.photos?.map((p: { url: any }) => p.url).join(", ") ||
                "N/A"
              }`,
            }),
            new Paragraph({ text: "\n---\n" }),
          ]),
        },
      ],
    });
  }

  private generateWordReportLease(leases: any[]): Document {
    return new Document({
      sections: [
        {
          properties: {},
          children: leases.flatMap((lease) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Lease ID: ${lease._id}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: `Property ID: ${lease.property?._id}` }),
            new Paragraph({ text: `Tenant ID: ${lease.tenant?._id}` }),
            new Paragraph({ text: `Start Date: ${lease.leaseStart}` }),
            new Paragraph({ text: `End Date: ${lease.leaseEnd}` }),
            new Paragraph({
              text: `Monthly Rent: ${lease.rentAmount}`,
            }),
            new Paragraph({
              text: `Deposit: ${lease.securityDeposit}`,
            }),
            new Paragraph({
              text: `Lease Terms: ${lease.terms}`,
            }),
            new Paragraph({ text: "\n---\n" }),
          ]),
        },
      ],
    });
  }

  private generateWordReportMaintenance(maintenances: any[]): Document {
    return new Document({
      sections: [
        {
          properties: {},
          children: maintenances.flatMap((maintenance) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Maintenance ID: ${maintenance._id}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: `Property ID: ${maintenance.property?._id}`,
            }),
            new Paragraph({
              text: `Tenant ID: ${maintenance.tenant?._id}`,
            }),
            new Paragraph({
              text: `Request Date: ${maintenance.createdAt}`,
            }),
            new Paragraph({
              text: `Description: ${maintenance.description}`,
            }),
            new Paragraph({
              text: `Status: ${maintenance.status}`,
            }),
            new Paragraph({
              text: `Assigned To: ${maintenance.assignedTo}`,
            }),
            new Paragraph({
              text: `Cost: ${maintenance.cost}`,
            }),
            new Paragraph({
              text: `Completion Date: ${maintenance.completionDate}`,
            }),
            new Paragraph({ text: "\n---\n" }),
          ]),
        },
      ],
    });
  }

  private generateWordReportRentInvoice(rentInvoices: any[]): Document {
    return new Document({
      sections: [
        {
          properties: {},
          children: rentInvoices.flatMap((rentInvoice) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Invoice ID: ${rentInvoice._id}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: `Lease ID: ${rentInvoice.lease?._id}`,
            }),
            new Paragraph({
              text: `Invoice Date: ${rentInvoice.invoiceDate}`,
            }),
            new Paragraph({
              text: `Due Date: ${rentInvoice.dueDate}`,
            }),
            new Paragraph({
              text: `Amount: ${rentInvoice.rentAmount}`,
            }),
            new Paragraph({
              text: `Payment Status: ${rentInvoice.paymentStatus}`,
            }),
            new Paragraph({ text: "\n---\n" }),
          ]),
        },
      ],
    });
  }

  private generateWordReportUser(users: any[]): Document {
    return new Document({
      sections: [
        {
          properties: {},
          children: users.flatMap((user) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `User ID: ${user._id}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: `First Name: ${user.firstName}`,
            }),
            new Paragraph({
              text: `Last Name: ${user.lastName}`,
            }),
            new Paragraph({
              text: `Email: ${user.email}`,
            }),
            new Paragraph({
              text: `Phone Number: ${user.phoneNumber}`,
            }),
            new Paragraph({
              text: `Role: ${user.role}`,
            }),
            new Paragraph({ text: "\n---\n" }),
          ]),
        },
      ],
    });
  }

  public async fetchUserReportData() {
    try {
      const users = await this.fetchData<IUser>("User");
      return this.aggregateUserReportData(users);
    } catch (error) {
      logger.error(`Error fetching user report data: ${error}`);
      throw error;
    }
  }

  private aggregateUserReportData(users: IUser[]) {
    const roleCounts = users.reduce(
      (acc, user) => {
        const role = user.role || "Unknown";
        acc[role] = acc[role] || {
          active: 0,
          inactive: 0,
          pending: 0,
          total: 0,
        };
        if (user.status === "active") {
          acc[role].active++;
        } else if (user.status === "inactive") {
          acc[role].inactive++;
        } else if (user.status === "pending") {
          acc[role].pending++;
        }
        acc[role].total++;
        return acc;
      },
      {} as {
        [role: string]: {
          active: number;
          inactive: number;
          pending: number;
          total: number;
        };
      }
    );

    const roleList = Object.keys(roleCounts);
    const report = roleList.map((role) => {
      return {
        role,
        active: roleCounts[role].active,
        inactive: roleCounts[role].inactive,
        pending: roleCounts[role].pending,
        total: roleCounts[role].total,
      };
    });
    logger.info("Aggregated user report data.");
    return report;
  }

  public async fetchDashboardReportData() {
    try {
      const properties = await this.fetchData<IProperty>("Property");
      const maintenances = await this.fetchData<IMaintenance>("Maintenance");
      const complaints = await this.fetchData<IComplaint>("Complaint");

      return this.aggregateDashboardReportData(
        properties,
        maintenances,
        complaints
      );
    } catch (error) {
      logger.error(`Error fetching dashboard report data: ${error}`);
      throw error;
    }
  }

  private aggregateDashboardReportData(
    properties: IProperty[],
    maintenances: IMaintenance[],
    complaints: IComplaint[]
  ) {
    const propertyStatusCounts: PropertyStatusCounts = Object.values(
      PropertyStatus
    ).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as PropertyStatusCounts);
    propertyStatusCounts["Unknown"] = 0;

    properties.forEach((property) => {
      const status = property.status || "Unknown";
      if (Object.values(PropertyStatus).includes(status as PropertyStatus)) {
        propertyStatusCounts[status as PropertyStatus]++;
      } else {
        propertyStatusCounts["Unknown"]++;
      }
    });

    const maintenanceStatusCounts: MaintenanceStatusCounts = Object.values(
      MaintenanceStatus
    ).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as MaintenanceStatusCounts);
    maintenanceStatusCounts["Unknown"] = 0;

    maintenances.forEach((maintenance) => {
      const status = maintenance.status || "Unknown";
      if (
        Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)
      ) {
        maintenanceStatusCounts[status as MaintenanceStatus]++;
      } else {
        maintenanceStatusCounts["Unknown"]++;
      }
    });

    const complaintStatusCounts: ComplaintStatusCounts = Object.values(
      ComplaintStatus
    ).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as ComplaintStatusCounts);
    complaintStatusCounts["Unknown"] = 0;

    complaints.forEach((complaint) => {
      const status = complaint.status || "Unknown";
      if (Object.values(ComplaintStatus).includes(status as ComplaintStatus)) {
        complaintStatusCounts[status as ComplaintStatus]++;
      } else {
        complaintStatusCounts["Unknown"]++;
      }
    });

    logger.info("Aggregated dashboard report data.");
    return {
      properties: propertyStatusCounts,
      maintenances: maintenanceStatusCounts,
      complaints: complaintStatusCounts,
    };
  }
}

export const reportService = new ReportService();
