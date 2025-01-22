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

class TenantService {
  public async createTenant(
    tenantData: Partial<ITenant>,
    files?: Express.Multer.File[],
    loggedInUserId?: string
  ): Promise<{ tenant: ITenant; user: IUser }> {
    const { tenantName, contactInformation, password } = tenantData;

    if (!tenantName || !contactInformation?.email) {
      throw new Error("Tenant name and email are required.");
    }

    const defaultPassword = randomInt(10000, 100000).toString();
    const unhashedPassword = password || defaultPassword;
    const hashedPassword = await bcrypt.hash(unhashedPassword, 10);

    // Create a new tenant without saving yet
    const newTenant = new Tenant({
      ...tenantData,
      password: hashedPassword,
      registeredBy: loggedInUserId,
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
        }

        const idProofs = files.map((file) => {
          const newPath = path.join(tenantFolder, file.filename);
          fs.renameSync(file.path, newPath);
          return newPath;
        });

        // Update the tenant with idProof paths
        savedTenant.idProof = idProofs;
        await savedTenant.save();
      } catch (error) {
        console.error("Error handling file uploads:", error);
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
    });

    try {
      const savedUser = await newUser.save();

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
          }
        });
      }
      // Delete the tenant if user creation fails
      await Tenant.findByIdAndDelete(savedTenant._id);
      throw error;
    }
  }

  public async getAllTenants(query: any): Promise<{
    tenants: Partial<ITenant & { tenantUser?: IUser }>[];
    totalPages: number;
    currentPage: number;
    totalTenants: number;
  }> {
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

    return {
      tenants,
      totalPages: Math.ceil(totalTenants / limit),
      currentPage: Number(page),
      totalTenants,
    };
  }

  public async getTenantById(
    id: string
  ): Promise<(ITenant & { tenantUser?: IUser }) | null> {
    const tenant = await Tenant.findById(id)
      .populate("propertyInformation")
      .populate("registeredBy") // Keep this to show the creator of the tenant
      .lean();

    if (!tenant) {
      return null;
    }

    // Fetch tenantUser based on the tenant's email
    const tenantUser = await User.findOne({
      email: tenant.contactInformation.email,
    }).lean();

    if (tenantUser) {
      (tenant as any).tenantUser = tenantUser; // Add tenantUser data to the tenant object
    }

    return tenant;
  }

  public async updateTenant(
    id: string,
    updateData: Partial<ITenant>,
    files?: Express.Multer.File[]
  ) {
    const tenant = await Tenant.findById(id);

    if (!tenant) {
      throw new Error("Tenant not found");
    }
    if (files && files.length > 0) {
      const tenantFolder = path.join("uploads", "tenants", tenant.id);
      if (!fs.existsSync(tenantFolder)) {
        fs.mkdirSync(tenantFolder, { recursive: true });
      }
      const idProofs = files.map((file) => {
        const newPath = path.join(tenantFolder, file.filename);
        fs.renameSync(file.path, newPath);
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
      throw new Error("Tenant not found");
    }

    return updatedTenant;
  }

  public async updateTenantUserPhoto(
    id: string,
    photo: Express.Multer.File
  ): Promise<IUser | null> {
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const tenantUser = await User.findOne({
      email: tenant.contactInformation.email,
    });

    if (!tenantUser) {
      throw new Error("Tenant user not found");
    }
    const profileFolder = path.join("uploads", "profile", tenantUser.id);

    // Ensure the profile folder exists
    if (!fs.existsSync(profileFolder)) {
      fs.mkdirSync(profileFolder, { recursive: true });
    }
    const newPhotoPath = path.join(profileFolder, photo.filename);

    // If user has an existing photo, delete it
    if (tenantUser.photo) {
      try {
        if (fs.existsSync(tenantUser.photo)) {
          fs.unlinkSync(tenantUser.photo);
        }
      } catch (error) {
        console.error("Error deleting previous profile picture: ", error);
        // Log the error, but don't prevent the update from happening
      }
    }
    //Move file to new folder
    fs.renameSync(photo.path, newPhotoPath);
    tenantUser.photo = newPhotoPath;

    const updatedUser = await tenantUser.save();
    return updatedUser;
  }

  public async deleteTenant(id: string): Promise<ITenant | null> {
    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return null; // Tenant not found, nothing to delete
    }

    // Delete the corresponding user based on email
    await User.deleteOne({ email: tenant.contactInformation.email });

    // Delete ID Proof files
    if (tenant.idProof && tenant.idProof.length > 0) {
      tenant.idProof.forEach((proof) => {
        if (fs.existsSync(proof)) {
          // Check if the file exists before unlinking
          fs.unlinkSync(proof);
        }
      });
    }

    //Finally delete the tenant itself
    await Tenant.findByIdAndDelete(id);

    return tenant;
  }

  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{ csvPath: string; wordPath: string; tenants: ITenant[] }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch tenants within the date range
    const tenants: ITenant[] = await Tenant.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    if (!tenants || tenants.length === 0) {
      throw new Error("No tenants found for the given date range");
    }

    // Ensure that the 'reports' directory exists outside 'src'
    const reportsDir = path.join(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
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

    // Return file paths and tenants
    return { csvPath: csvFilePath, wordPath: wordFilePath, tenants };
  }

  public async getTenantsByUserAdmin(registeredBy: string, query: any) {
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

    return {
      tenants,
      totalPages: Math.ceil(totalTenants / limit),
      currentPage: Number(page),
      totalTenants,
    };
  }
}
export const tenantService = new TenantService();
