import express from "express";
import multer from "multer";
import { tenantController } from "../controllers/tenant.controller";
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

// Configure Multer to handle file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // Specify your upload directory
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 1024 * 1024 * 55, // Limit to 55MB
  },
}).fields([
  { name: "idProof", maxCount: 3 }, // Expecting up to 3 files for idProof
]);

router.use(authenticate);

//Generate Report
router.get("/report", admin, tenantController.generateReport);

// Create a tenant
router.post("/", admin, upload, tenantController.createTenant);

// GET tenants (for all users)
router.get("/", tenantController.getAllTenants);

// GET tenant by ID
router.get("/:id", tenantController.getTenantById);

// UPDATE tenant by ID
router.put("/:id", admin, upload, tenantController.updateTenant);

// DELETE tenant by ID
router.delete("/:id", tenantController.deleteTenant);

export default router;
