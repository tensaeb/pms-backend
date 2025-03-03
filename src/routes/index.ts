import multer, { StorageEngine } from "multer";
import express, { Request, Response, Router } from "express";
import path from "path";

import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import propertyRoutes from "./property.routes";
import tenantRoutes from "./tenant.routes";
import leaseRoutes from "./lease.route";
import rentInvoiceRoutes from "./rentInvoice.routes";
import maintenanceRoutes from "./maintenance.route";
import reportRoutes from "./report.routes";
import complaintRoutes from "./complaint.route";
import guestRoutes from "./guest.route";
import clearanceRoutes from "./clearance.route";
import tasksRoutes from "./task.routes";
import notificationsRoutes from "./notification.route";

const router: Router = express.Router();

// Multer for file uploads (receipts, ID proofs, etc.)
const storage: StorageEngine = multer.diskStorage({
  destination(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    if (file.fieldname === "receipt") {
      cb(null, path.join("uploads", "receipts")); // receipts now has its own sub folder
    } else if (file.fieldname === "idProof") {
      cb(null, path.join("uploads", "ids")); // ids now has its own sub folder
    } else if (file.fieldname === "photos") {
      cb(null, path.join("uploads", "properties")); // files coming from the property routes are stored in here
    } else {
      cb(null, "uploads");
    }
  },
  filename(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Routes for file uploads (ID Proofs, Receipts)
router.post(
  "/upload/receipt",
  upload.single("receipt"),
  (req: Request, res: Response) => {
    if (req.file) {
      res.json({ filePath: `/receipts/${req.file.filename}` });
    } else {
      res.status(400).json({ message: "No file uploaded" });
    }
  }
);

router.post(
  "/upload/idProof",
  upload.single("idProof"),
  (req: Request, res: Response) => {
    if (req.file) {
      res.json({ filePath: `/uploads/ids/${req.file.filename}` });
    } else {
      res.status(400).json({ message: "No file uploaded" });
    }
  }
);

// Static folder for file uploads
router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
router.use(
  "/uploads/receipts",
  express.static(path.join(process.cwd(), "uploads", "receipts"))
); // Serve receipts from the sub folder

router.use(
  "/uploads/maintenance",
  express.static(path.join(process.cwd(), "uploads", "maintenance"))
);
router.use(
  "/uploads/clearance",
  express.static(path.join(process.cwd(), "uploads", "clearance"))
);
// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/properties", propertyRoutes);
router.use("/tenants", tenantRoutes);
router.use("/lease", leaseRoutes);
router.use("/rent-invoices", rentInvoiceRoutes);
router.use("/maintenances", maintenanceRoutes);
router.use("/reports", reportRoutes);
router.use("/complaints", complaintRoutes);
router.use("/guests", guestRoutes);
router.use("/clearance", clearanceRoutes);
router.use("/tasks", tasksRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
