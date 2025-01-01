import { Request, Response } from "express";
import { guestService } from "../services/guest.services";
import { errorResponse, successResponse } from "../utils/apiResponse";

class GuestController {
  async createGuest(req: Request, res: Response): Promise<void> {
    try {
      const loggedInUserId = req.user?.id;

      const newGuest = await guestService.createGuest(req.body, loggedInUserId);
      res
        .status(201)
        .json(successResponse(newGuest, "Guest Created Successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to Create Guest"));
    }
  }
  async fetchAllGuests(req: Request, res: Response): Promise<void> {
    try {
      const guests = await guestService.getAllGuests(req.query);
      res
        .status(200)
        .json(successResponse(guests, "Guests fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch guests"));
    }
  }

  async fetchGuestById(req: Request, res: Response): Promise<void> {
    try {
      const guest = await guestService.getGuestById(req.params.id);
      if (!guest) {
        res.status(404).json(errorResponse("Guest not found"));
      }
      res
        .status(200)
        .json(successResponse(guest, "Guest Fetched Successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch guest"));
    }
  }

  async updateGuest(req: Request, res: Response): Promise<void> {
    try {
      const updatedGuest = await guestService.updateGuest(
        req.params.id,
        req.body
      );
      if (!updatedGuest) {
        res.status(404).json(errorResponse("Guest not found"));
      }
      res
        .status(200)
        .json(successResponse(updatedGuest, "Guest updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update guest"));
    }
  }

  async deleteGuest(req: Request, res: Response): Promise<void> {
    try {
      const deletedGuest = await guestService.deleteGuest(req.params.id);
      if (!deletedGuest) {
        res.status(404).json(errorResponse("Guest not found"));
      }
      res
        .status(200)
        .json(successResponse(deletedGuest, "Guest deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete guest"));
    }
  }
  public async getGuestsByRegisteredBy(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const query = req.query;
      const guests = await guestService.getGuestsByRegisteredBy(
        registeredBy,
        query
      );
      res
        .status(200)
        .json(
          successResponse(
            guests,
            "Guests fetched successfully by Registered By Id"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch guest by registered By")
        );
    }
  }
}
export const guestController = new GuestController();
