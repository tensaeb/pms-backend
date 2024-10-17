import express from "express";
import { rentInvoiceController } from "../controllers/rentInvoice.controller";
import { admin, authenticate, superAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(authenticate);

// Route for generating rent invoice report
router.get("/report", admin, rentInvoiceController.generateReport);

// Create a rent invoice
router.post("/", admin, rentInvoiceController.createRentInvoice);

// GET rent invoices (for all users)
router.get("/", rentInvoiceController.getAllRentInvoices);

// GET rent invoice by ID
router.get("/:id", rentInvoiceController.getRentInvoiceById);

// UPDATE rent invoice by ID
router.put("/:id", admin, rentInvoiceController.updateRentInvoice);

// DELETE rent invoice by ID
router.delete("/:id", superAdmin, rentInvoiceController.deleteRentInvoice);

export default router;
