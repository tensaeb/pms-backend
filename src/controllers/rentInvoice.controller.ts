import { Request, Response } from "express";
import { rentInvoiceService } from "../services/rentInvoice.services";
import { errorResponse, successResponse } from "../utils/apiResponse";

class RentInvoiceController {
  // Create a new rent invoice
  public async createRentInvoice(req: Request, res: Response): Promise<void> {
    try {
      const newRentInvoice = await rentInvoiceService.createRentInvoice(
        req.body
      );
      res
        .status(201)
        .json(
          successResponse(newRentInvoice, "Rent Invoice created successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create rent invoice"));
    }
  }

  // Get all rent invoices with pagination and search
  public async getAllRentInvoices(req: Request, res: Response): Promise<void> {
    try {
      const rentInvoices = await rentInvoiceService.getAllRentInvoices(
        req.query
      );

      res
        .status(200)
        .json(
          successResponse(rentInvoices, "Rent Invoices fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch rent invoices"));
    }
  }

  // Get a rent invoice by ID
  public async getRentInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const rentInvoice = await rentInvoiceService.getRentInvoiceById(
        req.params.id
      );
      if (!rentInvoice) {
        res.status(404).json(errorResponse("Rent Invoice not found"));
      }
      res
        .status(200)
        .json(
          successResponse(rentInvoice, "Rent Invoice fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch rent invoice"));
    }
  }

  // Update a rent invoice by ID
  public async updateRentInvoice(req: Request, res: Response): Promise<void> {
    try {
      const updatedRentInvoice = await rentInvoiceService.updateRentInvoice(
        req.params.id,
        req.body
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedRentInvoice,
            "Rent Invoice updated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update rent invoice"));
    }
  }

  // Delete a rent invoice by ID
  public async deleteRentInvoice(req: Request, res: Response): Promise<void> {
    try {
      const rentInvoice = await rentInvoiceService.deleteRentInvoice(
        req.params.id
      );
      res
        .status(200)
        .json(
          successResponse(rentInvoice, "Rent Invoice deleted successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete rent invoice"));
    }
  }

  // Generate rent invoice report
  public async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Validate startDate and endDate
      if (!startDate || !endDate) {
        res
          .status(400)
          .json({ message: "Start date and end date are required" });
        return;
      }

      // Generate the report and get file paths along with the rent invoices
      const { csvPath, wordPath, rentInvoices } =
        await rentInvoiceService.generateReport(
          startDate as string,
          endDate as string
        );

      // Return the file paths and the rent invoices data in the response
      res.status(200).json({
        message: "Report generated successfully",
        data: {
          files: {
            csv: csvPath,
            word: wordPath,
          },
          rentInvoices, // Return the rent invoices data in the response
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to generate report", error: error.message });
    }
  }
}

export const rentInvoiceController = new RentInvoiceController();
