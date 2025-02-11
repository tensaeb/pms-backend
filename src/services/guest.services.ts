// guest.service.js
import { IGuest } from "../interfaces/guest.interface";
import { Guest } from "../models/guest.model";
import { User } from "../models/user.model";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import * as fs from "fs";
import path from "path";
import logger from "../utils/logger"; // Import logger

class GuestService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), "uploads", "guests");

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
      throw error;
    }
  }

  //generate 8 digit code
  private generateAccessCode(): string {
    return String(Math.floor(10000000 + Math.random() * 90000000));
  }
  private async generateQRCode(guest: IGuest, userId: string): Promise<string> {
    try {
      const userFolder = path.join(this.UPLOAD_DIR, userId);
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
        logger.info(`Created user folder: ${userFolder}`);
      }
      const fileName = `${guest.id}.svg`;
      const filePath = path.join(userFolder, fileName);

      const qrCodeData = guest.id;

      if (qrCodeData.length > 200) {
        throw new Error("Data size too large for QR code.");
      }

      await QRCode.toFile(filePath, qrCodeData, {
        errorCorrectionLevel: "M",
        type: "svg",
        margin: 1,
        width: 300,
      });
      logger.info(`Generated QR code for guest ${guest.id} at ${filePath}`);
      return `/uploads/guests/${userId}/${fileName}`;
    } catch (error) {
      logger.error(`Error generating QR code for guest ${guest.id}: ${error}`);
      throw error;
    }
  }
  private parseDate(date: any): Date | null {
    try {
      if (!date) {
        return null;
      }
      return new Date(date);
    } catch (error) {
      logger.warn(`Invalid date format: ${date}. Returning null.`);
      return null;
    }
  }

  private async updateGuestStatus(guest: IGuest): Promise<IGuest> {
    try {
      const now = new Date();
      let newStatus: "active" | "expired" | "cancelled" = guest.status;

      if (guest.status !== "cancelled") {
        if (guest.departureDate && now > guest.departureDate) {
          newStatus = "expired";
        } else {
          newStatus = "active";
        }
      }
      if (newStatus !== guest.status) {
        guest.status = newStatus;
        guest.lastStatusUpdate = now;
        await guest.save();
        logger.info(`Guest ${guest.id} status updated to ${newStatus}`);
      }
      return guest;
    } catch (error) {
      logger.error(
        `Error updating guest status for guest ${guest.id}: ${error}`
      );
      throw error;
    }
  }

  public async createGuest(
    guestData: Partial<IGuest>,
    loggedInUserId: string | undefined
  ): Promise<IGuest> {
    try {
      if (!loggedInUserId) {
        throw new Error("Logged in user ID is required");
      }
      if (!guestData.property) {
        throw new Error("Property ID is required");
      }
      const arrivalDate = this.parseDate(guestData.arrivalDate);
      let departureDate = null;
      if (guestData.departureDate) {
        departureDate = this.parseDate(guestData.departureDate);
        if (!departureDate) {
          throw new Error(
            "Please make sure that  departureDate is in valid date format"
          );
        }
      }

      if (!arrivalDate) {
        throw new Error(
          "Please make sure that arrivalDate is in valid date format"
        );
      }

      if (departureDate && arrivalDate > departureDate) {
        throw new Error("Departure date must be after the arrival date");
      }

      const newGuest = new Guest({
        ...guestData,
        user: loggedInUserId,
        arrivalDate,
        departureDate,
      });
      const savedGuest = await newGuest.save();

      console.log(savedGuest);
      const qrCode = await this.generateQRCode(newGuest, loggedInUserId);
      const accessCode = this.generateAccessCode();
      savedGuest.accessCode = accessCode;
      savedGuest.qrCode = qrCode;
      await this.updateGuestStatus(savedGuest);

      logger.info(`Guest created with ID: ${savedGuest.id}`);
      return await savedGuest.save();
    } catch (error) {
      logger.error(`Error creating guest: ${error}`);
      throw error;
    }
  }

  public async getAllGuests(query: any): Promise<{
    guests: Partial<IGuest>[];
    totalPages: number;
    currentPage: number;
    totalGuests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const searchQuery: any = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };

      const [guests, totalGuests] = await Promise.all([
        Guest.find(searchQuery)
          .populate("user")
          .populate("property")
          .skip((page - 1) * limit)
          .limit(Number(limit)),
        Guest.countDocuments(searchQuery),
      ]);

      const updatedGuests = await Promise.all(
        guests.map((guest) => this.updateGuestStatus(guest))
      );

      logger.info(
        `Retrieved ${guests.length} guests (page ${page}, limit ${limit}, search "${search}"). Total guests: ${totalGuests}`
      );

      return {
        guests: updatedGuests,
        totalPages: Math.ceil(totalGuests / limit),
        currentPage: Number(page),
        totalGuests,
      };
    } catch (error) {
      logger.error(`Error getting all guests: ${error}`);
      throw error;
    }
  }
  public async getGuestById(id: string): Promise<IGuest | null> {
    try {
      const guest = await Guest.findById(id)
        .populate("user")
        .populate("property");
      if (!guest) {
        logger.warn(`Guest with ID ${id} not found.`);
        return null;
      }
      await this.updateGuestStatus(guest);
      logger.info(`Retrieved guest with ID: ${id}`);
      return guest;
    } catch (error) {
      logger.error(`Error getting guest by ID ${id}: ${error}`);
      throw error;
    }
  }
  public async updateGuest(
    id: string,
    updateData: Partial<IGuest>
  ): Promise<IGuest | null> {
    try {
      const guest = await Guest.findById(id);
      if (!guest) {
        logger.warn(`Guest with ID ${id} not found.`);
        throw new Error("Guest not found");
      }
      const arrivalDate = this.parseDate(updateData.arrivalDate);
      let departureDate = null;

      if (updateData.departureDate) {
        departureDate = this.parseDate(updateData.departureDate);
        if (!departureDate) {
          throw new Error(
            "Please make sure that  departureDate is in valid date format"
          );
        }
      }

      if (departureDate && arrivalDate && arrivalDate > departureDate) {
        throw new Error("Departure date must be after the arrival date");
      }
      const updatedGuest = await Guest.findByIdAndUpdate(
        id,
        { ...updateData, arrivalDate, departureDate },
        { new: true }
      );
      if (!updatedGuest) {
        logger.warn(`Guest with ID ${id} not found for updating.`);
        return null;
      }
      await this.updateGuestStatus(updatedGuest);
      logger.info(`Guest with ID ${id} updated successfully.`);
      return updatedGuest;
    } catch (error) {
      logger.error(`Error updating guest ${id}: ${error}`);
      throw error;
    }
  }
  public async deleteGuest(id: string): Promise<IGuest | null> {
    try {
      const deletedGuest = await Guest.findByIdAndDelete(id);
      if (!deletedGuest) {
        logger.warn(`Guest with ID ${id} not found for deletion.`);
        return null;
      }
      logger.info(`Guest with ID ${id} deleted successfully.`);
      return deletedGuest;
    } catch (error) {
      logger.error(`Error deleting guest ${id}: ${error}`);
      throw error;
    }
  }
  public async getGuestsByRegisteredBy(
    registeredBy: string,
    query: any
  ): Promise<{
    guests: Partial<IGuest>[];
    totalPages: number;
    currentPage: number;
    totalGuests: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const searchQuery: any = {
        user: registeredBy,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ],
      };

      const [guests, totalGuests] = await Promise.all([
        Guest.find(searchQuery)
          .populate("user")
          .populate("property")
          .skip((page - 1) * limit)
          .limit(Number(limit)),
        Guest.countDocuments(searchQuery),
      ]);
      const updatedGuests = await Promise.all(
        guests.map((guest) => this.updateGuestStatus(guest))
      );

      logger.info(
        `Retrieved guests registered by ${registeredBy} (page ${page}, limit ${limit}, search "${search}"). Total guests: ${totalGuests}`
      );

      return {
        guests: updatedGuests,
        totalPages: Math.ceil(totalGuests / limit),
        currentPage: Number(page),
        totalGuests,
      };
    } catch (error) {
      logger.error(
        `Error getting guests registered by ${registeredBy}: ${error}`
      );
      throw error;
    }
  }
}

export const guestService = new GuestService();
