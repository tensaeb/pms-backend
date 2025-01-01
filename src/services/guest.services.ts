import { IGuest } from "../interfaces/guest.interface";
import { Guest } from "../models/guest.model";
import { User } from "../models/user.model";
import { Property } from "../models/property.model";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import * as fs from "fs";
import path from "path";

class GuestService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), "uploads", "guests");

  constructor() {
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
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

      return `/uploads/guests/${userId}/${fileName}`;
    } catch (err: any) {
      console.error("Error generating QR code:", err.message);
      throw err;
    }
  }

  private parseDate(date: any): Date | null {
    try {
      if (!date) {
        return null;
      }
      return new Date(date);
    } catch (error) {
      return null;
    }
  }
  public async createGuest(
    guestData: Partial<IGuest>,
    loggedInUserId: string | undefined
  ): Promise<IGuest> {
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

    return await savedGuest.save();
  }

  public async getAllGuests(query: any): Promise<{
    guests: Partial<IGuest>[];
    totalPages: number;
    currentPage: number;
    totalGuests: number;
  }> {
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

    return {
      guests,
      totalPages: Math.ceil(totalGuests / limit),
      currentPage: Number(page),
      totalGuests,
    };
  }
  public async getGuestById(id: string): Promise<IGuest | null> {
    return await Guest.findById(id).populate("user").populate("property");
  }
  public async updateGuest(
    id: string,
    updateData: Partial<IGuest>
  ): Promise<IGuest | null> {
    return await Guest.findByIdAndUpdate(id, updateData, { new: true });
  }
  public async deleteGuest(id: string): Promise<IGuest | null> {
    return await Guest.findByIdAndDelete(id);
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
    return {
      guests,
      totalPages: Math.ceil(totalGuests / limit),
      currentPage: Number(page),
      totalGuests,
    };
  }
}

export const guestService = new GuestService();
