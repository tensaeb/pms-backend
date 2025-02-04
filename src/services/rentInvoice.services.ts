import { RentInvoice } from "../models/rentInvoice.model";
import { IRentInvoice } from "../interfaces/rentInvoice.interface";

import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ITenant } from "../interfaces/tenant.interface";
import { IProperty } from "../interfaces/property.interface";
import logger from "../utils/logger"; // Import logger

class RentInvoiceService {
  // Create a new rent invoice
  public async createRentInvoice(
    rentInvoiceData: Partial<IRentInvoice>
  ): Promise<IRentInvoice> {
    try {
      const newRentInvoice = new RentInvoice(rentInvoiceData);
      const savedRentInvoice = await newRentInvoice.save();
      logger.info(`Rent invoice created with ID: ${savedRentInvoice._id}`);
      return savedRentInvoice;
    } catch (error) {
      logger.error(`Error creating rent invoice: ${error}`);
      throw error;
    }
  }

  // Get all rent invoices with pagination and search
  public async getAllRentInvoices(query: any): Promise<{
    rentInvoices: Partial<IRentInvoice>[];
    totalPages: number;
    currentPage: number;
    totalRentInvoices: number;
  }> {
    try {
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

      logger.info(
        `Retrieved ${rentInvoices.length} rent invoices (page ${page}, limit ${limit}, search "${search}", paymentStatus "${paymentStatus}"). Total invoices: ${totalRentInvoices}`
      );

      return {
        rentInvoices,
        totalPages: Math.ceil(totalRentInvoices / limit),
        currentPage: Number(page),
        totalRentInvoices,
      };
    } catch (error) {
      logger.error(`Error getting all rent invoices: ${error}`);
      throw error;
    }
  }

  // Get a single rent invoice by ID
  public async getRentInvoiceById(id: string): Promise<IRentInvoice | null> {
    try {
      const rentInvoice = await RentInvoice.findById(id)
        .populate("tenant")
        .populate("property");

      if (!rentInvoice) {
        logger.warn(`Rent invoice with ID ${id} not found.`);
        return null;
      }

      logger.info(`Retrieved rent invoice with ID: ${id}`);
      return rentInvoice;
    } catch (error) {
      logger.error(`Error getting rent invoice by ID ${id}: ${error}`);
      throw error;
    }
  }

  // Update a rent invoice by ID
  public async updateRentInvoice(
    id: string,
    updateData: Partial<IRentInvoice>
  ): Promise<IRentInvoice | null> {
    try {
      const updatedRentInvoice = await RentInvoice.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedRentInvoice) {
        logger.warn(`Rent invoice with ID ${id} not found for update.`);
        throw new Error("Rent Invoice not found");
      }

      logger.info(`Rent invoice with ID ${id} updated successfully.`);
      return updatedRentInvoice;
    } catch (error) {
      logger.error(`Error updating rent invoice ${id}: ${error}`);
      throw error;
    }
  }

  // Delete a rent invoice by ID
  public async deleteRentInvoice(id: string): Promise<IRentInvoice | null> {
    try {
      const deletedRentInvoice = await RentInvoice.findByIdAndDelete(id);
      if (!deletedRentInvoice) {
        logger.warn(`Rent invoice with ID ${id} not found for deletion.`);
        return null;
      }

      logger.info(`Rent invoice with ID ${id} deleted successfully.`);
      return deletedRentInvoice;
    } catch (error) {
      logger.error(`Error deleting rent invoice ${id}: ${error}`);
      throw error;
    }
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
    try {
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
        logger.warn(
          `No rent invoices found for the given date range: ${startDate} - ${endDate}`
        );
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
      logger.info(`Generated CSV rent invoice report: ${csvFilePath}`);

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
              new Paragraph({
                text: `Payment Status: ${invoice.paymentStatus}`,
              }),
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
      logger.info(`Generated Word rent invoice report: ${wordFilePath}`);

      // Return file paths and rent invoices
      return { csvPath: csvFilePath, wordPath: wordFilePath, rentInvoices };
    } catch (error) {
      logger.error(`Error generating rent invoice report: ${error}`);
      throw error;
    }
  }
}

export const rentInvoiceService = new RentInvoiceService();
