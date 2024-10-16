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
}

export const rentInvoiceController = new RentInvoiceController();
