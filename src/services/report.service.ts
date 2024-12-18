import path from "path";
import fs from "fs";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { IProperty } from "../interfaces/property.interface";
import { ILease } from "../interfaces/lease.interface";
import { IMaintenance } from "../interfaces/maintenance.interface";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";
import { IUser } from "../interfaces/user.interface";
import mongoose from "mongoose";

class ReportService {
  private static ensureReportsDir() {
    const reportsDir = path.join(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }
    return reportsDir;
  }

  public async generatePropertyReport(startDate?: string, endDate?: string) {
    const properties = await this.fetchData<IProperty>(
      "Property",
      startDate,
      endDate
    );
    return this.generateReport(properties, "property");
  }

  public async generateLeaseReport(startDate?: string, endDate?: string) {
    const leases = await this.fetchData<ILease>("Lease", startDate, endDate);
    return this.generateReport(leases, "lease");
  }

  public async generateMaintenanceReport(startDate?: string, endDate?: string) {
    const maintenanceRequests = await this.fetchData<IMaintenance>(
      "Maintenance",
      startDate,
      endDate
    );
    return this.generateReport(maintenanceRequests, "maintenance");
  }

  public async generateRentInvoiceReport(startDate?: string, endDate?: string) {
    const rentInvoices = await this.fetchData<IRentInvoice>(
      "RentInvoice",
      startDate,
      endDate
    );
    return this.generateReport(rentInvoices, "rentInvoice");
  }

  public async generateUserReport(startDate?: string, endDate?: string) {
    const users = await this.fetchData<IUser>("User", startDate, endDate);
    return this.generateReport(users, "user");
  }

  private async fetchData<T>(
    modelName: string,
    startDate?: string,
    endDate?: string
  ): Promise<T[]> {
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
    return Model.find(filter).lean();
  }

  private async generateReport<T extends Record<string, any>>(
    data: T[],
    reportType: string
  ) {
    const reportsDir = ReportService.ensureReportsDir();
    const timestamp = Date.now();

    const csvPath = path.join(reportsDir, `${reportType}-${timestamp}.csv`);
    const wordPath = path.join(reportsDir, `${reportType}-${timestamp}.docx`);

    await this.generateCSV(data, csvPath);
    await this.generateWord(data, wordPath, reportType);

    return { csvPath, wordPath };
  }

  private async generateCSV<T extends Record<string, any>>(
    data: T[],
    filePath: string
  ) {
    const parser = new Parser();
    const csv = parser.parse(data);
    fs.writeFileSync(filePath, csv);
  }

  private async generateWord<T extends Record<string, any>>(
    data: T[],
    filePath: string,
    reportType: string
  ) {
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
    }

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
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
            new Paragraph({ text: `Rent Price: $${property.rentPrice}` }),
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
}

export const reportService = new ReportService();
