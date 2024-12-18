import express from "express";
import { reportController } from "../controllers/report.controller";
import { admin, authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(authenticate);

router.get("/properties", admin, reportController.generatePropertyReport);
router.get("/leases", admin, reportController.generateLeaseReport);
router.get("/maintenance", admin, reportController.generateMaintenanceReport);
router.get("/rent-invoices", admin, reportController.generateRentInvoiceReport);
router.get("/users", admin, reportController.generateUserReport);

export default router;
