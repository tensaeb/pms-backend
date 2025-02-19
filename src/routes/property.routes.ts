import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { propertyController } from "../controllers/property.controller";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/properties");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Create a new property
router.post(
  "/",
  authenticate,
  upload.array("photos"),
  propertyController.createProperty
);
//  Route to upload properties through excel
router.post(
  "/upload/excel",
  authenticate,
  upload.single("file"),
  propertyController.uploadPropertiesFromExcel
);

router.get("/images/:propertyId", propertyController.fetchAllImages);
router.get("/images/:propertyId/:imageId", propertyController.fetchSingleImage);

// Get all properties with pagination
router.get("/", authenticate, propertyController.getAllProperties);

// Get a property by ID
router.get("/:id", authenticate, propertyController.getPropertyById);

// get properties by admin id
router.get(
  "/user/:userId",
  authenticate,
  propertyController.getPropertiesByUserId
);

// get open properties by registeredBy id
router.get(
  "/userAdmin/:userAdminId/open", // Updated route path
  authenticate,
  propertyController.getOpenPropertiesByUserAdminId // Updated controller method
);

// get properties by registeredBy id
router.get(
  "/userAdmin/:userAdminId",
  authenticate,
  propertyController.getPropertiesByUserAdminId
);
// New route for fetching properties by status
router.get(
  "/status/:status",
  authenticate,
  propertyController.getPropertiesByStatus
);
// New Route for fetching property by type
router.get(
  "/type/:propertyType",
  authenticate,
  propertyController.getPropertiesByType
);
router.get(
  "/leased/user/:userId",
  propertyController.getLeasedPropertiesByUser
);
// Update a property by ID
router.put(
  "/:id",
  authenticate,
  upload.array("photos"),
  propertyController.updateProperty
);

// Soft delete property by ID
router.put("/:id/delete", authenticate, propertyController.softDeleteProperty);

// Soft delete a property by ID
router.delete("/:id", authenticate, propertyController.deleteProperty);

//Multiple Soft delete a property
router.post(
  "/delete/multiple",
  authenticate,
  propertyController.softDeleteMultipleProperties
);

// Edit a photo by ID
router.put(
  "/:propertyId/photos/:photoId",
  authenticate,
  upload.single("photo"),
  propertyController.editPhoto
);

// Delete a photo by ID
router.delete(
  "/:propertyId/photos/:photoId",
  authenticate,
  propertyController.deletePhoto
);

// NEW ROUTE: Get property status counts by registeredBy
router.get(
  "/statusCounts/:registeredBy",
  authenticate,
  propertyController.getPropertyStatusCounts
);

export default router;
