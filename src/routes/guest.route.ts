import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { guestController } from "../controllers/guest.controller";

const router = express.Router();

router.post("/", authenticate, guestController.createGuest);

router.get("/", authenticate, guestController.fetchAllGuests);

router.get("/:id", authenticate, guestController.fetchGuestById);
router.put("/:id", authenticate, guestController.updateGuest);

router.delete("/:id", authenticate, guestController.deleteGuest);

router.get(
  "/registeredBy/:registeredBy",
  authenticate,
  guestController.getGuestsByRegisteredBy
);

export default router;
