// **2. Guest Controller (guest.controller.ts)**
import { Request, Response } from "express";
import { guestService } from "../services/guest.services";
import { errorResponse, successResponse } from "../utils/apiResponse";
import mongoose from "mongoose";

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

  public async getGuestsForCurrentUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Access the user ID from the authenticated user in the request
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(errorResponse("User not authenticated."));
        return;
      }
      const query = req.query; // Extract query parameters for pagination/filtering

      const result = await guestService.getGuestsForCurrentUser(userId, query);
      res
        .status(200)
        .json(
          successResponse(
            result,
            "Guests fetched successfully for current user."
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch guests for current user."
          )
        );
    }
  }

  // *** NEW METHOD ***
  public async getGuestsByRegisteredByAdmin(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredByAdmin } = req.params;
      const query = req.query;

      const guests = await guestService.getGuestsByRegisteredByAdmin(
        registeredByAdmin,
        query
      );

      res
        .status(200)
        .json(
          successResponse(
            guests,
            "Guests fetched successfully by Registered By Admin ID"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch guests by Registered By Admin ID"
          )
        );
    }
  }
}
export const guestController = new GuestController();
