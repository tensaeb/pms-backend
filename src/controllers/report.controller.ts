import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { reportService } from "../services/report.service";

class ReportController {
  public async generatePropertyReport(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const { csvPath, wordPath } = await reportService.generatePropertyReport(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res
        .status(200)
        .json(
          successResponse(
            { csv: csvPath, word: wordPath },
            "Property report generated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to generate property report")
        );
    }
  }

  public async generateLeaseReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const { csvPath, wordPath } = await reportService.generateLeaseReport(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res
        .status(200)
        .json(
          successResponse(
            { csv: csvPath, word: wordPath },
            "Lease report generated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to generate lease report"));
    }
  }
  public async generateMaintenanceReport(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const { csvPath, wordPath } =
        await reportService.generateMaintenanceReport(
          startDate as string | undefined,
          endDate as string | undefined
        );

      res
        .status(200)
        .json(
          successResponse(
            { csv: csvPath, word: wordPath },
            "Maintenance report generated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to generate maintenance report")
        );
    }
  }

  public async generateRentInvoiceReport(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const { csvPath, wordPath } =
        await reportService.generateRentInvoiceReport(
          startDate as string | undefined,
          endDate as string | undefined
        );

      res
        .status(200)
        .json(
          successResponse(
            { csv: csvPath, word: wordPath },
            "Rent invoice report generated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to generate rent invoice report")
        );
    }
  }

  public async generateUserReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const { csvPath, wordPath } = await reportService.generateUserReport(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res
        .status(200)
        .json(
          successResponse(
            { csv: csvPath, word: wordPath },
            "User report generated successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to generate user report"));
    }
  }
}

export const reportController = new ReportController();
