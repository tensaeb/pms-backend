import multer, { StorageEngine } from "multer";
import express, { Request, Response, Router } from "express";
import path from "path";

// Assuming the userRoutes, propertyRoutes, tenantRoutes, leaseRoutes,
// maintenanceRoutes, and rentInvoiceRoutes are imported from other modules
// import userRoutes from "./userRoutes";
// import propertyRoutes from "./propertyRoutes";
// import tenantRoutes from "./tenantRoutes";
// import leaseRoutes from "./leaseRoutes";
// import maintenanceRoutes from "./maintenanceRoutes";
// import rentInvoiceRoutes from "./rentInvoiceRoutes";

const router: Router = express.Router();

// Multer for file uploads (receipts, ID proofs, etc.)
const storage: StorageEngine = multer.diskStorage({
  destination(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    if (file.fieldname === "receipt") {
      cb(null, "receipts/");
    } else if (file.fieldname === "idProof") {
      cb(null, "uploads/ids/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(null, `${Date.now()}-${file.originalname}`);
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
router.use("/uploads", express.static(path.join(__dirname, "uploads")));
router.use("/receipts", express.static(path.join(__dirname, "receipts"))); // Serve receipts

// API routes
// router.use("/users", userRoutes);
// router.use("/properties", propertyRoutes);
// router.use("/tenants", tenantRoutes);
// router.use("/leases", leaseRoutes);
// router.use("/maintenance", maintenanceRoutes);
// router.use("/invoices", rentInvoiceRoutes); // Rent invoice routes

export default router;
