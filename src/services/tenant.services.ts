import { ITenant } from "../interfaces/tenant.interface";
import { Tenant } from "../models/tenant.model";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { User } from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import { randomInt } from "crypto";
import logger from "../utils/logger"; // Import logger
import mongoose from "mongoose";

class TenantService {
  public async createTenant(
    tenantData: Partial<ITenant>,
    files?: Express.Multer.File[],
    loggedInUserId?: string
  ): Promise<{ tenant: ITenant; user: IUser }> {
    try {
      const { tenantName, contactInformation, password } = tenantData;

      if (!tenantName || !contactInformation?.email) {
        logger.warn("Tenant name and email are required.");
        throw new Error("Tenant name and email are required.");
      }

      if (!loggedInUserId) {
        logger.warn("loggedInUserId is required to create a tenant.");
        throw new Error("loggedInUserId is required.");
      }

      const loggedInUser = await User.findById(loggedInUserId);
      if (!loggedInUser) {
        logger.warn(`User with ID ${loggedInUserId} not found.`);
        throw new Error("User not found.");
      }

      const registeredByAdmin = loggedInUser.registeredBy;

      const defaultPassword = randomInt(10000, 100000).toString();
      const unhashedPassword = password || defaultPassword;
      const hashedPassword = await bcrypt.hash(unhashedPassword, 10);

      // Create a new tenant without saving yet
      const newTenant = new Tenant({
        ...tenantData,
        password: hashedPassword,
        registeredBy: loggedInUserId,
        registeredByAdmin: registeredByAdmin, // Add the registeredByAdmin field
      });

      // Save the tenant first to get the ID
      const savedTenant = await newTenant.save();

      // Handle file uploads after saving tenant to use the correct ID
      if (files && files.length > 0) {
        try {
          const tenantFolder = path.join(
            "uploads",
            "tenants",
            savedTenant.id.toString()
          );
          if (!fs.existsSync(tenantFolder)) {
            fs.mkdirSync(tenantFolder, { recursive: true });
            logger.info(`Created tenant folder: ${tenantFolder}`);
          }

          const idProofs = files.map((file) => {
            const newPath = path.join(tenantFolder, file.filename);
            fs.renameSync(file.path, newPath);
            logger.info(`Moved ID proof to: ${newPath}`);
            return newPath;
          });

          // Update the tenant with idProof paths
          savedTenant.idProof = idProofs;
          await savedTenant.save();
        } catch (error) {
          logger.error(`Error handling file uploads: ${error}`);
          throw new Error("Failed to process ID proof files");
        }
      }

      // Create a corresponding user
      const newUser = new User({
        name: tenantName,
        email: contactInformation.email,
        password: hashedPassword,
        role: "Tenant",
        tempPassword: defaultPassword,
        registeredBy: loggedInUserId,
        registeredByAdmin: registeredByAdmin, // Add the registeredByAdmin field
      });

      try {
        const savedUser = await newUser.save();
        logger.info(`Tenant user created with ID: ${savedUser._id}`);
        return {
          tenant: savedTenant,
          user: savedUser,
        };
      } catch (error) {
        // Clean up uploaded files if user save fails
        if (savedTenant.idProof) {
          savedTenant.idProof.forEach((filePath) => {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              logger.info(`Deleted ID proof file: ${filePath}`);
            }
          });
        }
        // Delete the tenant if user creation fails
        await Tenant.findByIdAndDelete(savedTenant._id);
        logger.info(`Tenant with ID ${savedTenant._id} deleted.`);
        throw error;
      }
    } catch (error) {
      logger.error(`Error creating tenant: ${error}`);
      throw error;
    }
  }

  public async getAllTenants(query: any): Promise<{
    tenants: Partial<ITenant & { tenantUser?: IUser }>[];
    totalPages: number;
    currentPage: number;
    totalTenants: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "" } = query;

      const searchQuery: any = {
        tenantName: { $regex: search, $options: "i" },
      };

      const tenants = await Tenant.find(searchQuery)
        .populate("propertyInformation")
        .populate("registeredBy") // Keep this to show the creator of the tenant
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

      // Fetch tenantUser for each tenant based on their email
      for (const tenant of tenants) {
        const tenantUser = await User.findOne({
          email: tenant.contactInformation.email,
        }).lean();

        if (tenantUser) {
          (tenant as any).tenantUser = tenantUser; // Add tenantUser data to the tenant object
        }
      }

      const totalTenants = await Tenant.countDocuments(searchQuery);

      logger.info(
        `Retrieved ${tenants.length} tenants (page ${page}, limit ${limit}, search "${search}"). Total tenants: ${totalTenants}`
      );

      return {
        tenants,
        totalPages: Math.ceil(totalTenants / limit),
        currentPage: Number(page),
        totalTenants,
      };
    } catch (error) {
      logger.error(`Error getting all tenants: ${error}`);
      throw error;
    }
  }

  public async getTenantById(
    id: string
  ): Promise<(ITenant & { tenantUser?: IUser }) | null> {
    try {
      const tenant = await Tenant.findById(id)
        .populate("propertyInformation")
        .populate("registeredBy") // Keep this to show the creator of the tenant
        .lean();

      if (!tenant) {
        logger.warn(`Tenant with ID ${id} not found.`);
        return null;
      }

      // Fetch tenantUser based on the tenant's email
      const tenantUser = await User.findOne({
        email: tenant.contactInformation.email,
      }).lean();

      if (tenantUser) {
        (tenant as any).tenantUser = tenantUser; // Add tenantUser data to the tenant object
      }

      logger.info(`Retrieved tenant with ID: ${id}`);
      return tenant;
    } catch (error) {
      logger.error(`Error getting tenant by ID ${id}: ${error}`);
      throw error;
    }
  }

  public async updateTenant(
    id: string,
    updateData: Partial<ITenant>,
    files?: Express.Multer.File[]
  ) {
    try {
      const tenant = await Tenant.findById(id);

      if (!tenant) {
        logger.warn(`Tenant with ID ${id} not found for update.`);
        throw new Error("Tenant not found");
      }
      if (files && files.length > 0) {
        const tenantFolder = path.join("uploads", "tenants", tenant.id);
        if (!fs.existsSync(tenantFolder)) {
          fs.mkdirSync(tenantFolder, { recursive: true });
          logger.info(`Created tenant folder: ${tenantFolder}`);
        }
        const idProofs = files.map((file) => {
          const newPath = path.join(tenantFolder, file.filename);
          fs.renameSync(file.path, newPath);
          logger.info(`Moved ID proof to: ${newPath}`);
          return newPath;
        });

        tenant.set("idProof", idProofs);
        // Merge updateData and idProofs
        Object.assign(updateData, { idProof: tenant.idProof });
      }

      const updatedTenant = await Tenant.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      if (!updatedTenant) {
        logger.warn(`Tenant with ID ${id} not found for update.`);
        throw new Error("Tenant not found");
      }

      logger.info(`Tenant with ID ${id} updated successfully.`);
      return updatedTenant;
    } catch (error) {
      logger.error(`Error updating tenant ${id}: ${error}`);
      throw error;
    }
  }

  public async updateTenantUserPhoto(
    id: string,
    photo: Express.Multer.File
  ): Promise<IUser | null> {
    try {
      const tenant = await Tenant.findById(id);
      if (!tenant) {
        logger.warn(`Tenant with ID ${id} not found.`);
        throw new Error("Tenant not found");
      }
      const tenantUser = await User.findOne({
        email: tenant.contactInformation.email,
      });

      if (!tenantUser) {
        logger.warn(`Tenant user not found for tenant ${id}.`);
        throw new Error("Tenant user not found");
      }
      const profileFolder = path.join("uploads", "profile", tenantUser.id);

      // Ensure the profile folder exists
      if (!fs.existsSync(profileFolder)) {
        fs.mkdirSync(profileFolder, { recursive: true });
        logger.info(`Created profile folder: ${profileFolder}`);
      }
      const newPhotoPath = path.join(profileFolder, photo.filename);

      // If user has an existing photo, delete it
      if (tenantUser.photo) {
        try {
          if (fs.existsSync(tenantUser.photo)) {
            fs.unlinkSync(tenantUser.photo);
            logger.info(
              `Deleted previous profile picture: ${tenantUser.photo}`
            );
          }
        } catch (error) {
          logger.error("Error deleting previous profile picture: ", error);
          // Log the error, but don't prevent the update from happening
        }
      }
      //Move file to new folder
      fs.renameSync(photo.path, newPhotoPath);
      logger.info(`Moved new profile picture to: ${newPhotoPath}`);
      tenantUser.photo = newPhotoPath;

      const updatedUser = await tenantUser.save();
      logger.info(`Updated tenant user photo for user ${tenantUser.id}.`);
      return updatedUser;
    } catch (error) {
      logger.error(
        `Error updating tenant user photo for tenant ${id}: ${error}`
      );
      throw error;
    }
  }

  public async deleteTenant(id: string): Promise<ITenant | null> {
    try {
      const tenant = await Tenant.findById(id);

      if (!tenant) {
        logger.warn(`Tenant with ID ${id} not found for deletion.`);
        return null; // Tenant not found, nothing to delete
      }

      // Delete the corresponding user based on email
      await User.deleteOne({ email: tenant.contactInformation.email });
      logger.info(
        `Deleted tenant user with email: ${tenant.contactInformation.email}`
      );

      // Delete ID Proof files
      if (tenant.idProof && tenant.idProof.length > 0) {
        tenant.idProof.forEach((proof) => {
          if (fs.existsSync(proof)) {
            // Check if the file exists before unlinking
            fs.unlinkSync(proof);
            logger.info(`Deleted ID proof file: ${proof}`);
          }
        });
      }

      //Finally delete the tenant itself
      await Tenant.findByIdAndDelete(id);
      logger.info(`Tenant with ID ${id} deleted successfully.`);
      return tenant;
    } catch (error) {
      logger.error(`Error deleting tenant ${id}: ${error}`);
      throw error;
    }
  }

  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{ csvPath: string; wordPath: string; tenants: ITenant[] }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Fetch tenants within the date range
      const tenants: ITenant[] = await Tenant.find({
        createdAt: { $gte: start, $lte: end },
      }).lean();

      if (!tenants || tenants.length === 0) {
        logger.warn(
          `No tenants found for the given date range: ${startDate} - ${endDate}`
        );
        throw new Error("No tenants found for the given date range");
      }

      // Ensure that the 'reports' directory exists outside 'src'
      const reportsDir = path.join(__dirname, "../../reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
        logger.info(`Created reports directory: ${reportsDir}`);
      }

      // Create a timestamp for the report filenames
      const timestamp = Date.now();

      // Prepare data for CSV
      const cleanedTenants = tenants.map((tenant) => ({
        tenantName: tenant.tenantName,
        email: tenant.contactInformation.email,
        phoneNumber: tenant.contactInformation.phoneNumber,
        emergencyContact: tenant.contactInformation.emergencyContact || "",
        startDate: tenant.leaseAgreement.startDate,
        endDate: tenant.leaseAgreement.endDate,
        rentAmount: tenant.leaseAgreement.rentAmount,
        securityDeposit: tenant.leaseAgreement.securityDeposit,
        propertyId: tenant.propertyInformation.propertyId,
        moveInDate: tenant.moveInDate,
      }));

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(cleanedTenants);

      // Write CSV report
      const csvFilePath = `${reportsDir}/tenants-report-${timestamp}.csv`;
      fs.writeFileSync(csvFilePath, csv);
      logger.info(`Generated CSV tenant report: ${csvFilePath}`);

      // Generate Word report
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: cleanedTenants.flatMap((tenant) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Tenant Name: ${tenant.tenantName}`,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({ text: `Email: ${tenant.email}` }),
              new Paragraph({ text: `Phone Number: ${tenant.phoneNumber}` }),
              new Paragraph({
                text: `Emergency Contact: ${tenant.emergencyContact}`,
              }),
              new Paragraph({ text: `Lease Start Date: ${tenant.startDate}` }),
              new Paragraph({ text: `Lease End Date: ${tenant.endDate}` }),
              new Paragraph({ text: `Rent Amount: $${tenant.rentAmount}` }),
              new Paragraph({
                text: `Security Deposit: $${tenant.securityDeposit}`,
              }),
              new Paragraph({ text: `Move-In Date: ${tenant.moveInDate}` }),
              new Paragraph({
                children: [new TextRun("\n-------------------------------\n")],
              }),
            ]),
          },
        ],
      });

      const wordFilePath = `${reportsDir}/tenants-report-${timestamp}.docx`;
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(wordFilePath, buffer);
      logger.info(`Generated Word tenant report: ${wordFilePath}`);

      // Return file paths and tenants
      return { csvPath: csvFilePath, wordPath: wordFilePath, tenants };
    } catch (error) {
      logger.error(`Error generating tenant report: ${error}`);
      throw error;
    }
  }

  public async getTenantsByUserAdmin(registeredBy: string, query: any) {
    try {
      const { page = 1, limit = 10, search = "" } = query;

      // First, find all users registered by this ID
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      const searchQuery: any = {
        registeredBy: { $in: registeredUserIds },
        tenantName: { $regex: search, $options: "i" },
      };

      const tenants = await Tenant.find(searchQuery)
        .populate({
          path: "registeredBy",
          select: "name email role status",
        })
        .populate("propertyInformation")
        .populate("user")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

      const totalTenants = await Tenant.countDocuments(searchQuery);
      logger.info(
        `Retrieved tenants registered by users with ID ${registeredBy} (page ${page}, limit ${limit}, search "${search}"). Total tenants: ${totalTenants}`
      );

      return {
        tenants,
        totalPages: Math.ceil(totalTenants / limit),
        currentPage: Number(page),
        totalTenants,
      };
    } catch (error) {
      logger.error(`Error getting tenants by user admin: ${error}`);
      throw error;
    }
  }
}
export const tenantService = new TenantService();
