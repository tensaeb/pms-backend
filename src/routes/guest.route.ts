// **3. Guest Routes (guest.routes.ts)**
import express from "express";
import { authenticate, admin } from "../middlewares/authMiddleware";
import { guestController } from "../controllers/guest.controller";

const router = express.Router();

router.post("/", authenticate, guestController.createGuest);

router.get("/user", authenticate, guestController.getGuestsForCurrentUser);

router.get("/", authenticate, guestController.fetchAllGuests);

router.get("/:id", authenticate, guestController.fetchGuestById);
router.put("/:id", authenticate, guestController.updateGuest);

router.delete("/:id", authenticate, guestController.deleteGuest);

router.get(
  "/registeredBy/:registeredBy",
  authenticate,
  guestController.getGuestsByRegisteredBy
);

router.get(
  "/registeredByAdmin/:registeredByAdmin",
  authenticate,
  admin,
  guestController.getGuestsByRegisteredByAdmin
);

export default router;
