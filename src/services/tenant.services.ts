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
import { UserWithUnhashedPassword } from "./user.services";

class TenantService {
  public async createTenant(
    tenantData: Partial<ITenant>,
    files?: Express.Multer.File[],
    loggedInUserId?: string
  ): Promise<{ tenant: ITenant; user: UserWithUnhashedPassword }> {
    const { tenantName, contactInformation, password } = tenantData;

    if (!tenantName || !contactInformation?.email) {
      throw new Error("Tenant name and email are required.");
    }

    const defaultPassword = randomInt(10000, 100000).toString();
    const unhashedPassword = password || defaultPassword;
    const hashedPassword = await bcrypt.hash(unhashedPassword, 10);

    // Create a new tenant in the tenant collection
    const newTenant = new Tenant({
      ...tenantData,
      password: hashedPassword,
      registeredBy: loggedInUserId,
    });

    if (files && files.length > 0) {
      newTenant.idProof = files.map((file) => file.filename);
    }

    // Create a corresponding user with the "Tenant" role
    const newUser = new User({
      name: tenantName,
      email: contactInformation.email,
      password: hashedPassword,
      role: "Tenant",
      registeredBy: loggedInUserId,
    });

    const savedUser = await newUser.save();
    const userWithPassword = savedUser.toObject();

    // Save the tenant data
    const savedTenant = await newTenant.save();

    return {
      tenant: savedTenant,
      user: {
        ...userWithPassword,
        unhashedPassword,
      } as UserWithUnhashedPassword,
    };
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
    if (files && files.length > 0) {
      updateData.idProof = files.map((file) => file.filename);
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedTenant) {
      throw new Error("Tenant not found");
    }

    return updatedTenant;
  }

  public async deleteTenant(id: string): Promise<ITenant | null> {
    const tenant = await Tenant.findByIdAndDelete(id);
    if (tenant && tenant.idProof && tenant.idProof.length > 0) {
      tenant.idProof.forEach((proof) => {
        fs.unlinkSync(proof);
      });
    }
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
