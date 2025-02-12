import express from "express";
import { clearanceController } from "../controllers/clearance.controller";
import { admin, authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(authenticate);

router.post("/", clearanceController.createClearance);
router.get("/", clearanceController.getAllClearances);
router.get("/:id", clearanceController.getClearanceById);
router.put("/approve/:id", admin, clearanceController.approveClearance);
router.put("/inspect/:id", clearanceController.inspectClearance);
router.put("/reject/:id", admin, clearanceController.rejectClearance);
router.put("/:id", clearanceController.updateClearance);
router.delete("/:id", clearanceController.deleteClearance);
router.get(
  "/inspected/:userId",
  clearanceController.getClearancesByInspectedUser
);
router.get(
  "/uninspected/clearances",
  admin,
  clearanceController.getUninspectedClearances
);

// *** ADD THIS ROUTE ***
router.get("/tenant/:tenantId", clearanceController.getClearancesByTenantId);

export default router;
