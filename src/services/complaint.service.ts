// complaint.service.ts
import { Complaint } from "../models/complaint.model";
import { IComplaint } from "../interfaces/complaint.interface";
import { User } from "../models/user.model";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

class ComplaintService {
  private readonly UPLOAD_DIR = path.join(
    process.cwd(),
    "uploads",
    "complaints"
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
      processedFilePaths.push(`/uploads/complaints/${fileName}`);
    }

    return processedFilePaths;
  }
  public async createComplaint(
    complaintData: Partial<IComplaint>,
    supportingFiles?: Express.Multer.File[],
    userId?: string
  ): Promise<IComplaint> {
    const { tenant, property, complaintType, description, priority, notes } =
      complaintData;

    const newComplaint = new Complaint({
      tenant,
      property,
      complaintType,
      description,
      priority,
      notes,
      createdBy: userId,
    });

    if (supportingFiles && supportingFiles.length > 0) {
      // Process images and get URLs
      const processedFileUrls = await this.processImages(supportingFiles);
      newComplaint.supportingFiles = processedFileUrls;
    }
    return await newComplaint.save();
  }

  public async getAllComplaints(query: any): Promise<{
    complaints: Partial<IComplaint>[];
    totalPages: number;
    currentPage: number;
    totalComplaints: number;
  }> {
    const { page = 1, limit = 10, search = "", status } = query;

    let searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { "tenant.name": { $regex: search, $options: "i" } },
        { "property.name": { $regex: search, $options: "i" } },
        { complaintType: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      searchQuery.status = status;
    }
    const complaints = await Complaint.find(searchQuery)
      .populate("tenant")
      .populate("property")
      .populate({
        path: "createdBy",
        populate: {
          path: "registeredBy",
        },
      })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const totalComplaints = await Complaint.countDocuments(searchQuery);
    return {
      complaints,
      totalPages: Math.ceil(totalComplaints / limit),
      currentPage: Number(page),
      totalComplaints,
    };
  }

  public async getComplaintById(id: string): Promise<IComplaint | null> {
    return await Complaint.findById(id)
      .populate("tenant")
      .populate("property")
      .populate({
        path: "createdBy",
        populate: {
          path: "registeredBy",
        },
      })
      .populate("tenant");
  }

  public async assignComplaint(
    id: string,
    assignedTo: string
  ): Promise<IComplaint | null> {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedTo: assignedTo, status: "In Progress" },
      { new: true }
    ).populate("assignedTo");
    if (!updatedComplaint) {
      throw new Error("Complaint request not found");
    }
    return updatedComplaint;
  }

  public async updateComplaint(
    id: string,
    updateData: Partial<IComplaint>
  ): Promise<IComplaint | null> {
    const updatedComplaint = await Complaint.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedComplaint) {
      throw new Error("Complaint request not found");
    }
    return updatedComplaint;
  }
  public async submitComplaintFeedback(
    id: string,
    feedback: string
  ): Promise<IComplaint | null> {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { feedback: feedback, status: "Resolved" },
      { new: true }
    );
    if (!updatedComplaint) {
      throw new Error("Complaint request not found");
    }
    return updatedComplaint;
  }

  public async deleteComplaint(id: string): Promise<IComplaint | null> {
    return await Complaint.findByIdAndDelete(id);
  }
  public async getComplaintsByAssignedUser(
    userId: string
  ): Promise<IComplaint[]> {
    return await Complaint.find({ assignedTo: userId })
      .populate("tenant")
      .populate("property")
      .populate({
        path: "createdBy",
        populate: {
          path: "registeredBy",
        },
      });
  }
  public async getUnassignedComplaints(): Promise<IComplaint[]> {
    return await Complaint.find({ assignedTo: { $exists: false } })
      .populate("tenant")
      .populate("property")
      .populate({
        path: "createdBy",
        populate: {
          path: "registeredBy",
        },
      });
  }
  public async getComplaintsByRegisteredUser(
    registeredBy: string,
    query: any
  ): Promise<{
    complaints: Partial<IComplaint>[];
    totalPages: number;
    currentPage: number;
    totalComplaints: number;
  }> {
    const { page = 1, limit = 10, search = "", status } = query;
    // First, find all users registered by this ID
    const registeredUsers = await User.find({ registeredBy: registeredBy });
    const registeredUserIds = registeredUsers.map((user) => user._id);

    const searchQuery: any = {
      createdBy: { $in: registeredUserIds },
    };

    if (search) {
      searchQuery.$or = [
        { "tenant.name": { $regex: search, $options: "i" } },
        { "property.name": { $regex: search, $options: "i" } },
        { complaintType: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      searchQuery.status = status;
    }

    const complaints = await Complaint.find(searchQuery)
      .populate("tenant")
      .populate("property")
      .populate({
        path: "createdBy",
        populate: {
          path: "registeredBy",
        },
      })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalComplaints = await Complaint.countDocuments(searchQuery);

    return {
      complaints,
      totalPages: Math.ceil(totalComplaints / limit),
      currentPage: Number(page),
      totalComplaints,
    };
  }
}

export const complaintService = new ComplaintService();
