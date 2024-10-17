import express from "express";
import multer from "multer";
import { leaseController } from "../controllers/lease.controller";
import { admin, authenticate, superAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Change this path as needed
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Create the multer instance
const upload = multer({ storage: storage }).array("documents", 5); // Accept up to 5 documents

router.use(authenticate);

// Route for generating lease report
router.get("/report", admin, leaseController.generateReport);

// Route to download lease document
router.get("/download/:file", leaseController.downloadLeaseDocument);

// Create a lease
router.post("/", admin, upload, leaseController.createLease);

// GET leases (for all users)
router.get("/", leaseController.getAllLeases);

// GET lease by ID
router.get("/:id", leaseController.getLeaseById);

// UPDATE lease by ID
router.put("/:id", admin, upload, leaseController.updateLease);

// DELETE lease by ID
router.delete("/:id", admin, leaseController.deleteLease);

export default router;
