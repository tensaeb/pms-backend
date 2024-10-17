import express from "express";
import multer from "multer";
import { propertyController } from "../controllers/property.controller";
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
const upload = multer({ storage: storage }).array("photos", 5); // Accept up to 5 photos

router.use(authenticate);

// Generate CSV and Word reports within a date range (admin only)
router.get("/report", admin, propertyController.generateReport);

// Create a property
router.post("/", superAdmin, upload, propertyController.createProperty);

// GET properties (for all users)
router.get("/", propertyController.getAllProperties);

// GET properties by ID
router.get("/:id", propertyController.getPropertyById);

// UPDATE property by ID
router.put("/:id", admin, upload, propertyController.updateProperty);

// DELETE property by ID
router.delete("/:id", admin, propertyController.deleteProperty);

export default router;
