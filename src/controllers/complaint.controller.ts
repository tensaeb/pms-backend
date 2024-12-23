import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { complaintService } from "../services/complaint.service";

class ComplaintController {
  public async createComplaint(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const uploadedFiles = req.files as Express.Multer.File[];

      const newComplaint = await complaintService.createComplaint(
        {
          ...req.body,
          tenant: user,
        },
        uploadedFiles
      );

      res
        .status(201)
        .json(successResponse(newComplaint, "Complaint created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create complaint"));
    }
  }

  public async getAllComplaints(req: Request, res: Response): Promise<void> {
    try {
      const complaints = await complaintService.getAllComplaints(req.query);
      res
        .status(200)
        .json(successResponse(complaints, "Complaints fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch complaints"));
    }
  }

  public async getComplaintById(req: Request, res: Response): Promise<void> {
    try {
      const complaint = await complaintService.getComplaintById(req.params.id);
      if (!complaint) {
        res.status(404).json(errorResponse("Complaint not found"));
        return;
      }
      res
        .status(200)
        .json(successResponse(complaint, "Complaint fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch complaint"));
    }
  }
  public async assignComplaint(req: Request, res: Response): Promise<void> {
    try {
      const { assignedTo } = req.body;
      const updatedComplaint = await complaintService.assignComplaint(
        req.params.id,
        assignedTo
      );
      res
        .status(200)
        .json(
          successResponse(updatedComplaint, "Complaint assigned successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to assign complaint"));
    }
  }

  public async updateComplaint(req: Request, res: Response): Promise<void> {
    try {
      const updatedComplaint = await complaintService.updateComplaint(
        req.params.id,
        req.body
      );
      res
        .status(200)
        .json(
          successResponse(updatedComplaint, "Complaint updated successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update complaint"));
    }
  }
  public async submitComplaintFeedback(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { feedback } = req.body;
      const updatedComplaint = await complaintService.submitComplaintFeedback(
        req.params.id,
        feedback
      );
      res
        .status(200)
        .json(
          successResponse(
            updatedComplaint,
            "Complaint feedback submitted successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to submit complaint feedback")
        );
    }
  }

  public async deleteComplaint(req: Request, res: Response): Promise<void> {
    try {
      const complaint = await complaintService.deleteComplaint(req.params.id);
      res
        .status(200)
        .json(successResponse(complaint, "Complaint deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete complaint"));
    }
  }

  public async getComplaintsByAssignedUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const complaints = await complaintService.getComplaintsByAssignedUser(
        req.params.userId
      );
      res
        .status(200)
        .json(
          successResponse(
            complaints,
            "Complaints for the user fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch complaints for the user"
          )
        );
    }
  }
  public async getUnassignedComplaints(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const complaints = await complaintService.getUnassignedComplaints();
      res
        .status(200)
        .json(
          successResponse(
            complaints,
            "Unassigned complaints fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch unassigned complaints")
        );
    }
  }
}

export const complaintController = new ComplaintController();
