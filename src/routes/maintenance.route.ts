import express from "express";
import multer from "multer";
import { maintenanceController } from "../controllers/maintenance.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Not an image or video! Please upload only images or videos.")
      );
    }
  },
  limits: { fileSize: 300 * 1024 * 1024 }, // Example: limit file size to 300MB
});

router.use(authenticate);

// Create a new maintenance request
router.post(
  "/",
  upload.array("photosOrVideos", 5),
  maintenanceController.createMaintenance
);

// Get all maintenance requests
router.get(
  "/",

  maintenanceController.getAllMaintenanceRequests
);

// Get a single maintenance request by ID
router.get("/:id", maintenanceController.getMaintenanceById);

// Update a maintenance request
router.put(
  "/:id",
  upload.array("photosOrVideos", 5),
  maintenanceController.updateMaintenance
);

// Delete a maintenance request
router.delete("/:id", maintenanceController.deleteMaintenance);

export default router;
