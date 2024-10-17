import { RentInvoice } from "../models/rentInvoice.model";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";

import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ITenant } from "../interfaces/tenant.interface";
import { IProperty } from "../interfaces/property.interface";

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

  // Generate rent invoice report with CSV and Word export
  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{
    csvPath: string;
    wordPath: string;
    rentInvoices: IRentInvoice[];
  }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch rent invoices within the date range
    const rentInvoices: IRentInvoice[] = await RentInvoice.find({
      invoiceDate: { $gte: start, $lte: end },
    })
      .populate("tenant")
      .populate("property")
      .lean();

    if (!rentInvoices || rentInvoices.length === 0) {
      throw new Error("No rent invoices found for the given date range");
    }

    // Ensure the 'reports' directory exists
    const reportsDir = path.join(__dirname, "..", "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Create a timestamp for the report filenames
    const timestamp = Date.now();

    // Prepare data for CSV
    const cleanedInvoices = rentInvoices.map((invoice) => ({
      tenantName: (invoice.tenant as ITenant)?.tenantName, // Populate tenant name
      propertyTitle: (invoice.property as IProperty)?.title, // Populate property title
      invoiceDate: invoice.invoiceDate,
      rentAmount: invoice.rentAmount,
      additionalCharges: invoice.additionalCharges,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
      paymentStatus: invoice.paymentStatus,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(cleanedInvoices);

    // Write CSV report
    const csvFilePath = `${reportsDir}/rent_invoice_report_${timestamp}.csv`;
    fs.writeFileSync(csvFilePath, csv);

    // Generate Word report
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanedInvoices.flatMap((invoice) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tenant: ${invoice.tenantName}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: `Property: ${invoice.propertyTitle}` }),
            new Paragraph({ text: `Invoice Date: ${invoice.invoiceDate}` }),
            new Paragraph({ text: `Rent Amount: $${invoice.rentAmount}` }),
            new Paragraph({
              text: `Additional Charges: $${invoice.additionalCharges}`,
            }),
            new Paragraph({ text: `Total Amount: $${invoice.totalAmount}` }),
            new Paragraph({ text: `Due Date: ${invoice.dueDate}` }),
            new Paragraph({ text: `Payment Status: ${invoice.paymentStatus}` }),
            new Paragraph({ text: `Created At: ${invoice.createdAt}` }),
            new Paragraph({ text: `Updated At: ${invoice.updatedAt}` }),
            new Paragraph({
              children: [new TextRun("\n-------------------------------\n")],
            }),
          ]),
        },
      ],
    });

    const wordFilePath = `${reportsDir}/rent_invoice_report_${timestamp}.docx`;
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(wordFilePath, buffer);

    // Return file paths and rent invoices
    return { csvPath: csvFilePath, wordPath: wordFilePath, rentInvoices };
  }
}

export const rentInvoiceService = new RentInvoiceService();
