import express from "express";
import multer from "multer";
import { tenantController } from "../controllers/tenant.controller";
import { admin, authenticate, superAdmin } from "../middlewares/authMiddleware";
import path from "path";

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
      // The destination is not really needed here since we will handle that on the services, just a placeholder
      cb(null, "uploads/");
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
// Configure Multer for single file uploads for profile picture
const uploadSingle = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // The destination is not really needed here since we will handle that on the services, just a placeholder
      cb(null, "uploads");
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 1024 * 1024 * 55, // Limit to 55MB
  },
}).single("photo");

router.use(authenticate);

//Generate Report
router.get("/report", admin, tenantController.generateReport);

// Create a tenant
router.post("/", upload, tenantController.createTenant);

// GET tenants (for all users)
router.get("/", tenantController.getAllTenants);

// GET tenant by ID
router.get("/:id", tenantController.getTenantById);

// Route to get tenants registered by a specific user
router.get(
  "/registeredBy/:registeredBy",
  authenticate,
  tenantController.getTenantsByUserAdmin
);
// NEW ROUTE: Get tenant status counts by registeredByAdmin
router.get(
  "/statusCounts/:registeredByAdmin",
  authenticate,
  tenantController.getTenantStatusCounts
);

// UPDATE tenant by ID
router.put("/:id", admin, upload, tenantController.updateTenant);

// UPDATE tenant user photo by ID
router.put("/:id/photo", uploadSingle, tenantController.updateTenantUserPhoto);

// DELETE tenant by ID
router.delete("/:id", tenantController.deleteTenant);

export default router;
