// complaint.service.ts

import { Complaint } from "../models/complaint.model";
import { IComplaint } from "../interfaces/complaint.interface";
import { User } from "../models/user.model";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import logger from "../utils/logger"; // Import the logger
import { Types } from "mongoose";

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
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) {
        fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        logger.info(`Created upload directory: ${this.UPLOAD_DIR}`);
      }
    } catch (error) {
      logger.error(`Error ensuring upload directory exists: ${error}`);
      throw error; // Re-throw to prevent the service from starting if the directory cannot be created
    }
  }

  public async processImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedFilePaths: string[] = [];

    try {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const imagePath = path.join(this.UPLOAD_DIR, fileName);

        // Resize and save the image
        await sharp(file.path).resize(800).toFile(imagePath);

        // Remove the original uploaded file
        fs.unlinkSync(file.path);

        // Add the URL of the processed file to the array
        processedFilePaths.push(`/uploads/complaints/${fileName}`);
        logger.info(`Processed image: ${imagePath}`);
      }

      return processedFilePaths;
    } catch (error) {
      logger.error(`Error processing images: ${error}`);
      throw error; // Re-throw to be handled upstream
    }
  }
  public async createComplaint(
    complaintData: Partial<IComplaint>,
    supportingFiles?: Express.Multer.File[],
    userId?: string
  ): Promise<IComplaint> {
    try {
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
      const savedComplaint = await newComplaint.save();
      logger.info(`Complaint created with ID: ${savedComplaint._id}`);
      return savedComplaint;
    } catch (error) {
      logger.error(`Error creating complaint: ${error}`);
      throw error;
    }
  }

  public async getAllComplaints(query: any): Promise<{
    complaints: Partial<IComplaint>[];
    totalPages: number;
    currentPage: number;
    totalComplaints: number;
  }> {
    try {
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

      logger.info(
        `Retrieved ${complaints.length} complaints (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total complaints: ${totalComplaints}`
      );

      return {
        complaints,
        totalPages: Math.ceil(totalComplaints / limit),
        currentPage: Number(page),
        totalComplaints,
      };
    } catch (error) {
      logger.error(`Error getting all complaints: ${error}`);
      throw error;
    }
  }

  public async getComplaintById(id: string): Promise<IComplaint | null> {
    try {
      const complaint = await Complaint.findById(id)
        .populate("tenant")
        .populate("property")
        .populate({
          path: "createdBy",
          populate: {
            path: "registeredBy",
          },
        })
        .populate("tenant");

      if (!complaint) {
        logger.warn(`Complaint with ID ${id} not found.`);
        return null;
      }

      logger.info(`Retrieved complaint with ID: ${id}`);
      return complaint;
    } catch (error) {
      logger.error(`Error getting complaint by ID ${id}: ${error}`);
      throw error;
    }
  }

  public async assignComplaint(
    id: string,
    assignedTo: string
  ): Promise<IComplaint | null> {
    try {
      const updatedComplaint = await Complaint.findByIdAndUpdate(
        id,
        { assignedTo: assignedTo, status: "In Progress" },
        { new: true }
      ).populate("assignedTo");
      if (!updatedComplaint) {
        logger.warn(`Complaint with ID ${id} not found.`);
        throw new Error("Complaint request not found");
      }

      logger.info(`Complaint ${id} assigned to user ${assignedTo}.`);
      return updatedComplaint;
    } catch (error) {
      logger.error(
        `Error assigning complaint ${id} to user ${assignedTo}: ${error}`
      );
      throw error;
    }
  }

  public async updateComplaint(
    id: string,
    updateData: Partial<IComplaint>
  ): Promise<IComplaint | null> {
    try {
      const updatedComplaint = await Complaint.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedComplaint) {
        logger.warn(`Complaint with ID ${id} not found.`);
        throw new Error("Complaint request not found");
      }

      logger.info(`Complaint ${id} updated successfully.`);
      return updatedComplaint;
    } catch (error) {
      logger.error(`Error updating complaint ${id}: ${error}`);
      throw error;
    }
  }
  public async submitComplaintFeedback(
    id: string,
    feedback: string
  ): Promise<IComplaint | null> {
    try {
      const updatedComplaint = await Complaint.findByIdAndUpdate(
        id,
        { feedback: feedback, status: "Resolved" },
        { new: true }
      );
      if (!updatedComplaint) {
        logger.warn(`Complaint with ID ${id} not found.`);
        throw new Error("Complaint request not found");
      }

      logger.info(`Complaint ${id} feedback submitted and marked as resolved.`);
      return updatedComplaint;
    } catch (error) {
      logger.error(`Error submitting feedback for complaint ${id}: ${error}`);
      throw error;
    }
  }

  public async deleteComplaint(id: string): Promise<IComplaint | null> {
    try {
      const deletedComplaint = await Complaint.findByIdAndDelete(id);
      if (!deletedComplaint) {
        logger.warn(`Complaint with ID ${id} not found.`);
        return null;
      }

      logger.info(`Complaint ${id} deleted successfully.`);
      return deletedComplaint;
    } catch (error) {
      logger.error(`Error deleting complaint ${id}: ${error}`);
      throw error;
    }
  }
  public async getComplaintsByAssignedUser(
    userId: string
  ): Promise<IComplaint[]> {
    try {
      const complaints = await Complaint.find({ assignedTo: userId })
        .populate("tenant")
        .populate("property")
        .populate({
          path: "createdBy",
          populate: {
            path: "registeredBy",
          },
        });
      logger.info(`Retrieved complaints assigned to user ${userId}.`);
      return complaints;
    } catch (error) {
      logger.error(
        `Error getting complaints assigned to user ${userId}: ${error}`
      );
      throw error;
    }
  }
  public async getUnassignedComplaints(): Promise<IComplaint[]> {
    try {
      const complaints = await Complaint.find({
        assignedTo: { $exists: false },
      })
        .populate("tenant")
        .populate("property")
        .populate({
          path: "createdBy",
          populate: {
            path: "registeredBy",
          },
        });
      logger.info(`Retrieved unassigned complaints.`);
      return complaints;
    } catch (error) {
      logger.error(`Error getting unassigned complaints: ${error}`);
      throw error;
    }
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
    try {
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
      logger.info(
        `Retrieved complaints created by users registered by ${registeredBy} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total complaints: ${totalComplaints}`
      );
      return {
        complaints,
        totalPages: Math.ceil(totalComplaints / limit),
        currentPage: Number(page),
        totalComplaints,
      };
    } catch (error) {
      logger.error(
        `Error getting complaints by users registered by ${registeredBy}: ${error}`
      );
      throw error;
    }
  }

  // *** ADD THIS METHOD ***
  public async getComplaintsByCreatedBy(
    userId: string,
    query: any
  ): Promise<{
    complaints: Partial<IComplaint>[];
    totalPages: number;
    currentPage: number;
    totalComplaints: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;

      const searchQuery: any = {
        createdBy: userId,
      };

      if (search) {
        searchQuery.$or = [
          { "property.name": { $regex: search, $options: "i" } },
          { complaintType: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }, // Add description search
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      const complaints = await Complaint.find(searchQuery)
        .populate("property")
        .populate("tenant")
        .populate({
          path: "createdBy",
          populate: {
            path: "registeredBy",
          },
        })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const totalComplaints = await Complaint.countDocuments(searchQuery);

      logger.info(
        `Retrieved ${complaints.length} complaints for User ${userId} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total complaints: ${totalComplaints}`
      );

      return {
        complaints,
        totalPages: Math.ceil(totalComplaints / limit),
        currentPage: Number(page),
        totalComplaints,
      };
    } catch (error) {
      logger.error(`Error getting complaints for user ${userId}: ${error}`);
      throw error;
    }
  }
  // *** MODIFIED METHOD ***
  public async getComplaintsByRegisteredByAdmin(
    registeredByAdmin: string,
    query: any
  ): Promise<{
    complaints: Partial<IComplaint>[];
    totalPages: number;
    currentPage: number;
    totalComplaints: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      const parsedLimit = Number(limit); // Ensure limit is a number
      const skip = (page - 1) * parsedLimit;

      // First, find all users registered by this admin
      const registeredUsers = await User.find({
        registeredByAdmin: new Types.ObjectId(registeredByAdmin),
      });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      console.log(`Registered users: ${registeredUserIds}`);

      // If no users are registered by the admin, return empty
      if (registeredUserIds.length === 0) {
        logger.info(
          `No users registered by admin ${registeredByAdmin}. Returning empty results.`
        );
        return {
          complaints: [],
          totalPages: 0,
          currentPage: Number(page),
          totalComplaints: 0,
        };
      }

      // Build the search query
      let searchQuery: any = {
        createdBy: { $in: registeredUserIds }, // Convert to strings
      };

      if (search) {
        searchQuery.$or = [
          { "property.name": { $regex: search, $options: "i" } },
          { complaintType: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      console.log("Final searchQuery:", JSON.stringify(searchQuery, null, 2));

      // Fetch complaints with populated data
      const complaints = await Complaint.find(searchQuery)
        .populate("property")
        .populate({
          path: "createdBy",
          populate: {
            path: "registeredBy",
          },
        })
        .skip(skip)
        .limit(parsedLimit);

      console.log(
        "Complaints with populated data:",
        JSON.stringify(complaints, null, 2)
      );

      // Count total complaints
      const totalComplaints = await Complaint.countDocuments(searchQuery);

      logger.info(
        `Retrieved complaints for tenants registered by admin ${registeredByAdmin} (page ${page}, limit ${limit}, search "${search}", status "${status}"). Total complaints: ${totalComplaints}`
      );

      return {
        complaints,
        totalPages: Math.ceil(totalComplaints / parsedLimit),
        currentPage: Number(page),
        totalComplaints,
      };
    } catch (error) {
      logger.error(
        `Error getting complaints for tenants registered by admin ${registeredByAdmin}: ${error}`
      );
      throw error;
    }
  }
}

export const complaintService = new ComplaintService();
