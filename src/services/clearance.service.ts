import { Clearance } from "../models/clearance.model";
import { IClearance } from "../interfaces/clearance.interface";
import { Property } from "../models/property.model";
import logger from "../utils/logger";
import { Tenant } from "../models/tenant.model";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { User } from "../models/user.model";

interface ImageOptions {
  fit: [number, number];
  align: "center" | "right" | "left";
  valign: "top" | "center" | "bottom";
  x?: number;
  y?: number;
}

class ClearanceService {
  private async generateClearancePDF(clearanceId: string): Promise<string> {
    logger.info(
      `generateClearancePDF: Generating PDF for clearanceId ${clearanceId}`
    );

    try {
      const clearance = await Clearance.findById(clearanceId)
        .populate("tenant")
        .populate("property");

      if (!clearance) {
        logger.error(
          `generateClearancePDF: Clearance with ID ${clearanceId} not found`
        );
        throw new Error("Clearance document not found");
      }

      if (!clearance.tenant || !clearance.property) {
        logger.error(
          `generateClearancePDF: Clearance with ID ${clearanceId} is missing tenant or property details`
        );
        throw new Error("Clearance is missing tenant or property details");
      }

      const doc = new PDFDocument({ autoFirstPage: false });
      const uploadDir = path.join(__dirname, `../../uploads/clearance`);
      const uniqueFilename = `clearance_${uuidv4()}.pdf`;
      const filePath = path.join(uploadDir, uniqueFilename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.info(`generateClearancePDF: Directory created: ${uploadDir}`);
      }

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc
        .addPage()
        .fontSize(20)
        .text("Property and Tenant Information", { align: "center" })
        .moveDown();

      // Define left and right column start positions
      const leftColumnX = 50;
      const rightColumnX = 300;

      //Function to make labels:
      function addLabelValue(
        doc: PDFKit.PDFDocument,
        label: string,
        value: string,
        y: number
      ): number {
        const options = {
          width: 200, // Fixed column width
          height: 100, // Max height before creating new page
          ellipsis: true, // Add ellipsis if text overflows
        };

        // Calculate label height
        const labelHeight = doc.heightOfString(`${label}:`, options);

        // Calculate value height (use empty string if undefined)
        const valueHeight = doc.heightOfString(value || "", options);

        // Use the taller column height
        const rowHeight = Math.max(labelHeight, valueHeight) + 5; // Add 5px padding

        // Draw label and value
        doc
          .fontSize(12)
          .text(`${label}:`, leftColumnX, y, options)
          .text(value || "N/A", rightColumnX, y, options);

        return rowHeight;
      }

      let currentY = 100;
      const fields = [
        { label: "Clearance ID", value: (clearance._id as any).toString() },
        { label: "Issued To", value: (clearance.tenant as any).tenantName },
        {
          label: "Property Address",
          value: (clearance.property as any).address,
        },
        {
          label: "Move Out Date",
          value: new Date(clearance.moveOutDate).toLocaleDateString(),
        },
        { label: "Status", value: clearance.status },
        { label: "Details", value: clearance.notes || "No details provided." },
        { label: "Property Title", value: (clearance.property as any).title },
        {
          label: "Tenant Email",
          value: (clearance.tenant as any).contactInformation?.email,
        },
        {
          label: "Tenant Phone",
          value: (clearance.tenant as any).contactInformation?.phoneNumber,
        },
        {
          label: "Property Rent",
          value: (clearance.property as any).rentPrice,
        },
      ];
      fields.forEach((field) => {
        const rowHeight = addLabelValue(
          doc,
          field.label,
          field.value,
          currentY
        );
        if (currentY + rowHeight > doc.page.height - 150) {
          // Leave space for signatures
          doc.addPage();
          currentY = 50; // Reset Y position for new page
        } else {
          currentY += rowHeight;
        }

        // Check if we need a new page
      });

      doc.moveDown();
      const assetsPath = path.join(__dirname, `../../assets`);
      const signaturePath = path.join(assetsPath, "signature.png");
      const stampPath = path.join(assetsPath, "stamp.png");

      const docBottom = doc.page.height;
      // Add signature

      const signatureOptions: any = {
        fit: [100, 50],
        align: "right",
        x: doc.page.width - 150, // Adjust horizontal position
        y: docBottom - 150, // Adjust vertical position
      };

      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, signatureOptions);
        doc
          .fontSize(8)
          .text("Authorized Signature", doc.page.width - 150, docBottom - 100, {
            // Adjust text position
            align: "right",
          } as any);
        doc.rotate(-20, { origin: [100, docBottom - 120] });
      } else {
        logger.warn(
          `generateClearancePDF: Signature image not found at path ${signaturePath}`
        );
      }

      // Add stamp
      if (fs.existsSync(stampPath)) {
        const stampOptions: any = {
          fit: [150, 150],
          x: 50,
          y: docBottom - 150,
        };
        doc.image(stampPath, stampOptions);

        // Rotate the stamp image
      } else {
        logger.warn(
          `generateClearancePDF: Stamp image not found at path ${stampPath}`
        );
      }
      // Function code
      doc.end();

      return new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
          logger.info(
            `generateClearancePDF: PDF generated successfully for clearanceId ${clearanceId} at ${filePath}`
          );
          // Resolve with the *relative* path to the file
          resolve(`/uploads/clearance/${uniqueFilename}`);
        });
        writeStream.on("error", (error: any) => {
          logger.error(
            `generateClearancePDF: Error writing PDF for clearanceId ${clearanceId}, ${error}`
          );
          reject(error);
        });
      });
    } catch (error) {
      logger.error(
        `generateClearancePDF: Error generating PDF for clearanceId ${clearanceId}, ${error}`
      );
      throw error;
    }
  }

  public async createClearance(
    clearanceData: Partial<IClearance>,
    loggedInUserId?: string
  ): Promise<IClearance> {
    logger.info(
      `ClearanceService: createClearance called with data: ${JSON.stringify(
        clearanceData
      )}`
    );
    try {
      const { property, moveOutDate, notes, reason } = clearanceData;
      const newClearance = new Clearance({
        tenant: loggedInUserId,
        property,
        moveOutDate,
        notes,
        reason,
      });

      await Tenant.findByIdAndUpdate(newClearance.tenant, {
        status: "pending",
      });

      const savedClearance = await newClearance.save();
      logger.info(
        `ClearanceService: createClearance - Clearance created successfully: ${savedClearance.id}`
      );
      return savedClearance;
    } catch (error) {
      logger.error(`ClearanceService: createClearance failed, ${error}`);
      throw error;
    }
  }

  public async getAllClearances(query: any): Promise<{
    clearances: Partial<IClearance>[];
    totalPages: number;
    currentPage: number;
    totalClearances: number;
  }> {
    logger.info(
      `ClearanceService: getAllClearances called with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      const limitNumber = Number(limit) || 10; // Default to 1 if limit is invalid
      let searchQuery: any = {};
      if (search) {
        searchQuery.$or = [
          { "tenant.name": { $regex: search, $options: "i" } },
          { "property.name": { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      const clearances = await Clearance.find(searchQuery)
        .populate("tenant")
        .populate("property");
      // .skip((page - 1) * limitNumber) removed
      //.limit(limitNumber); removed for this purpose
      const totalClearances = await Clearance.countDocuments(searchQuery);
      const totalPages =
        limitNumber > 0 ? Math.ceil(totalClearances / limitNumber) : 1; //removed for this reason as well
      logger.info(
        `ClearanceService: getAllClearances - Fetched ${clearances.length} clearances, total: ${totalClearances}`
      );
      return {
        clearances,
        totalPages,
        currentPage: Number(page),
        totalClearances,
      };
    } catch (error) {
      logger.error(`ClearanceService: getAllClearances failed, ${error}`);
      throw error;
    }
  }

  public async getClearanceById(id: string): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: getClearanceById called for clearanceId: ${id}`
    );
    try {
      const clearance = await Clearance.findById(id)
        .populate("tenant")
        .populate("property")
        .populate("approvedBy")
        .populate("inspectionBy");
      if (!clearance) {
        logger.error(
          `ClearanceService: getClearanceById - Clearance with ID ${id} not found`
        );
      }
      logger.info(
        `ClearanceService: getClearanceById - Fetched clearance with ID ${id}`
      );
      return clearance;
    } catch (error) {
      logger.error(
        `ClearanceService: getClearanceById failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async approveClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: approveClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      // First, update the clearance status
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        {
          status: "Approved",
          approvedBy: userId,
        },
        { new: true }
      )
        .populate("approvedBy")
        .populate("property")
        .populate("tenant"); // Make sure tenant is populated

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: approveClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }

      if (updatedClearance.property && updatedClearance.tenant) {
        await Property.findByIdAndUpdate(
          updatedClearance.property.id,
          { status: "open" },
          { new: true }
        );
        await Tenant.findByIdAndUpdate(
          updatedClearance.tenant.id,
          { status: "inactive" },
          { new: true }
        );
      } else {
        logger.error(
          `property or tenant not found on updatedClearance with ID ${id}`
        );
      }
      // Now, generate the PDF *after* the status is updated and other related changes
      let fileUrl: string = "";
      try {
        fileUrl = await this.generateClearancePDF(id);
      } catch (pdfError: any) {
        logger.error(
          `Error generating PDF for clearanceId: ${id}, ${pdfError}`
        );
        throw new Error(`Failed to generate PDF: ${pdfError.message}`);
      }

      const documentUpdate = await Clearance.findByIdAndUpdate(
        id,
        {
          document: {
            fileUrl: fileUrl,
            documentType: "Clearance Approval Confirmation",
          },
        },
        { new: true }
      )
        .populate("approvedBy")
        .populate("property")
        .populate("tenant");

      logger.info(
        `ClearanceService: approveClearance - Clearance approved for clearanceId: ${id} by userId: ${userId}`
      );
      return documentUpdate;
    } catch (error) {
      logger.error(
        `ClearanceService: approveClearance failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async inspectClearance(
    id: string,
    userId: string,
    feedback: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: inspectClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        {
          inspectionStatus: "Passed",
          inspectionBy: userId,
          inspectionDate: Date.now(),
          feedback: feedback,
        },
        { new: true }
      ).populate("inspectionBy");

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: inspectClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: inspectClearance - Clearance inspected for clearanceId: ${id} by userId: ${userId}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: inspectClearance failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async rejectClearance(
    id: string,
    userId: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: rejectClearance called for clearanceId: ${id} by userId: ${userId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        { status: "Rejected", rejectedBy: userId },
        { new: true }
      ).populate("approvedBy");

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: rejectClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: rejectClearance - Clearance rejected for clearanceId: ${id} by userId: ${userId}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: rejectClearance failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async updateClearance(
    id: string,
    updateData: Partial<IClearance>
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: updateClearance called for clearanceId: ${id} with data ${JSON.stringify(
        updateData
      )}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedClearance) {
        logger.error(
          `ClearanceService: updateClearance - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: updateClearance - Clearance updated successfully for clearanceId: ${id}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: updateClearance failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async deleteClearance(id: string): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: deleteClearance called for clearanceId: ${id}`
    );
    try {
      const clearance = await Clearance.findByIdAndDelete(id);
      if (!clearance) {
        logger.error(
          `ClearanceService: deleteClearance - Clearance with ID ${id} not found`
        );
      }
      logger.info(
        `ClearanceService: deleteClearance - Deleted clearance with ID ${id}`
      );
      return clearance;
    } catch (error) {
      logger.error(
        `ClearanceService: deleteClearance failed for clearanceId: ${id}, ${error}`
      );
      throw error;
    }
  }

  public async getClearancesByInspectedUser(
    userId: string
  ): Promise<IClearance[]> {
    logger.info(
      `ClearanceService: getClearancesByInspectedUser called for userId: ${userId}`
    );
    try {
      const clearances = await Clearance.find({ inspectionBy: userId })
        .populate("tenant")
        .populate("property");
      logger.info(
        `ClearanceService: getClearancesByInspectedUser - Fetched ${clearances.length} clearances for userId: ${userId}`
      );
      return clearances;
    } catch (error) {
      logger.error(
        `ClearanceService: getClearancesByInspectedUser failed for userId ${userId}, ${error}`
      );
      throw error;
    }
  }

  public async getUninspectedClearances(): Promise<IClearance[]> {
    logger.info(`ClearanceService: getUninspectedClearances called`);
    try {
      const clearances = await Clearance.find({
        inspectionBy: { $exists: false },
      })
        .populate("tenant")
        .populate("property");
      logger.info(
        `ClearanceService: getUninspectedClearances - Fetched ${clearances.length} uninspected clearances`
      );
      return clearances;
    } catch (error) {
      logger.error(
        `ClearanceService: getUninspectedClearances failed, ${error}`
      );
      throw error;
    }
  }

  public async assignInspector(
    id: string,
    inspectorId: string
  ): Promise<IClearance | null> {
    logger.info(
      `ClearanceService: assignInspector called for clearanceId: ${id} to userId: ${inspectorId}`
    );
    try {
      const updatedClearance = await Clearance.findByIdAndUpdate(
        id,
        { inspectionBy: inspectorId, inspectionStatus: "Scheduled" },
        { new: true }
      )
        .populate("tenant")
        .populate("property")
        .populate("inspectionBy"); // Populate the assigned inspector

      if (!updatedClearance) {
        logger.error(
          `ClearanceService: assignInspector - Clearance with ID ${id} not found`
        );
        throw new Error("Clearance request not found");
      }
      logger.info(
        `ClearanceService: assignInspector - Assigned inspector for clearanceId: ${id}`
      );
      return updatedClearance;
    } catch (error) {
      logger.error(
        `ClearanceService: assignInspector failed for clearanceId: ${id}`,
        error
      );
      throw error;
    }
  }

  // *** ADD THIS METHOD ***
  public async getClearancesByTenantId(
    tenantId: string,
    query: any
  ): Promise<{
    clearances: Partial<IClearance>[];
    totalPages: number;
    currentPage: number;
    totalClearances: number;
  }> {
    logger.info(
      `ClearanceService: getClearancesByTenantId called for tenantId: ${tenantId} with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      const limitNumber = Number(limit) || 10;

      const searchQuery: any = {
        tenant: tenantId,
      };

      if (search) {
        searchQuery.$or = [
          { "property.name": { $regex: search, $options: "i" } },
          { reason: { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        searchQuery.status = status;
      }

      const clearances = await Clearance.find(searchQuery)
        .populate("tenant")
        .populate("property")
        .skip((page - 1) * limitNumber)
        .limit(limitNumber);

      const totalClearances = await Clearance.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalClearances / limitNumber);

      logger.info(
        `ClearanceService: getClearancesByTenantId - Fetched ${clearances.length} clearances for tenant ${tenantId}, total: ${totalClearances}`
      );

      return {
        clearances,
        totalPages,
        currentPage: Number(page),
        totalClearances,
      };
    } catch (error) {
      logger.error(
        `ClearanceService: getClearancesByTenantId failed for tenantId: ${tenantId}, ${error}`
      );
      throw error;
    }
  }
  //NEW METHOD
  //Get count for statuses by registered By Admin
  public async getClearanceStatusCountsByRegisteredBy(
    registeredBy: string
  ): Promise<{
    clearanceStatusCounts: { [status: string]: number };
    inspectionStatusCounts: { [status: string]: number };
  }> {
    try {
      const { ObjectId } = mongoose.Types;

      // Find all users registered by this ID
      const registeredUsers = await User.find({ registeredBy: registeredBy });
      const registeredUserIds = registeredUsers.map((user) => user._id);

      // First, let’s create our base objects for the expected results so that even the empty results will be showing correctly.
      const clearanceStatusCounts: { [status: string]: number } = {
        Pending: 0,
        Approved: 0,
        Rejected: 0,
      };

      const inspectionStatusCounts: { [status: string]: number } = {
        Pending: 0,
        Passed: 0,
        Failed: 0,
      };

      const aggregationResult = await Clearance.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "tenant",
            foreignField: "_id",
            as: "tenantInfo",
          },
        },
        {
          $unwind: "$tenantInfo",
        },
        {
          $match: {
            "tenantInfo.registeredBy": new ObjectId(registeredBy),
          },
        },
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  status: "$_id",
                  count: 1,
                  _id: 0,
                },
              },
            ],
            inspectionCounts: [
              {
                $group: {
                  _id: "$inspectionStatus",
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  status: "$_id",
                  count: 1,
                  _id: 0,
                },
              },
            ],
          },
        },
      ]);

      const statusCountsArray = aggregationResult[0]?.statusCounts || [];
      const inspectionCountsArray =
        aggregationResult[0]?.inspectionCounts || [];

      statusCountsArray.forEach((item: any) => {
        clearanceStatusCounts[item.status] = item.count;
      });

      inspectionCountsArray.forEach((item: any) => {
        inspectionStatusCounts[item.status] = item.count;
      });

      logger.info(
        `Retrieved clearance and inspection status counts for registeredBy: ${registeredBy}`
      );

      return {
        clearanceStatusCounts,
        inspectionStatusCounts,
      };
    } catch (error: any) {
      logger.error(
        `Error getting clearance and inspection status counts by registeredBy: ${error}`
      );
      throw error;
    }
  }

  // *** ADD THIS METHOD ***
  public async getClearancesByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    clearances: Partial<IClearance>[];
    totalPages: number;
    currentPage: number;
    totalClearances: number;
  }> {
    logger.info(
      `ClearanceService: getClearancesByRegisteredBy called for registeredBy: ${registeredBy} with query: ${JSON.stringify(
        query
      )}`
    );
    try {
      const { page = 1, limit = 10, search = "", status } = query;
      const limitNumber = Number(limit) || 10;
      const { ObjectId } = mongoose.Types;

      // Validate registeredBy
      if (!mongoose.Types.ObjectId.isValid(registeredBy)) {
        logger.warn(`Invalid registeredBy value: ${registeredBy}`);
        return {
          clearances: [],
          totalPages: 0,
          currentPage: Number(page),
          totalClearances: 0,
        };
      }

      const propertiesAggregation = await Clearance.aggregate([
        {
          $lookup: {
            from: "users", // Changed from 'tenants' to 'users' to join with the User model
            localField: "tenant", // Clearance.tenant (ObjectId)
            foreignField: "_id", // User._id (ObjectId)
            as: "tenantDetails", // Renamed from "tenant" to "tenantDetails" for clarity
          },
        },
        { $unwind: "$tenantDetails" }, // Unwind the tenantDetails array to get a single tenant object
        {
          $match: {
            // Apply conditions to the unwound tenant object.
            "tenantDetails.registeredBy": new ObjectId(registeredBy),
          },
        },
        {
          $lookup: {
            from: "properties", // Changed from 'properties' to 'properties'
            localField: "property", // Join based on Clearance.property (ObjectId)
            foreignField: "_id", // Properties._id (ObjectId)
            as: "propertyDetails", // Renamed from "property" to "propertyDetails" for clarity
          },
        },
        { $unwind: "$propertyDetails" }, // Convert the result from array of 1 to 1 object
        {
          $match: {
            ...(search
              ? {
                  $or: [
                    {
                      "propertyDetails.title": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                    { reason: { $regex: search, $options: "i" } },
                  ],
                }
              : {}),
            ...(status ? { status: status } : {}),
          },
        },
        {
          $facet: {
            clearances: [
              //Apply pagination and project to remove unwanted fields
              { $skip: (Number(page) - 1) * Number(limitNumber) },
              { $limit: Number(limitNumber) },
              { $project: { __v: 0, tenantDetails: 0, propertyDetails: 0 } }, // Remove joined results from the properties data output to make it less heavy
            ],
            totalClearances: [{ $count: "count" }], // Gets the count of the documents
          },
        },
      ]);

      const clearances = propertiesAggregation[0]?.clearances || []; // Access properties from the facet
      const totalClearances =
        propertiesAggregation[0]?.totalClearances[0]?.count || 0;
      const totalPages = Math.ceil(totalClearances / Number(limitNumber));

      logger.info(
        `ClearanceService: getClearancesByRegisteredBy - Fetched ${clearances.length} clearances for registeredBy ${registeredBy}, total: ${totalClearances}`
      );

      return {
        clearances,
        totalPages,
        currentPage: Number(page),
        totalClearances,
      };
    } catch (error) {
      logger.error(
        `ClearanceService: getClearancesByRegisteredBy failed for registeredBy: ${registeredBy}, ${error}`
      );
      throw error;
    }
  }
}

export const clearanceService = new ClearanceService();
