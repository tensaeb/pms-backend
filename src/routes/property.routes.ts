// property.routes.ts
import express from "express";
import multer from "multer";
import { propertyController } from "../controllers/property.controller";
import { admin, authenticate } from "../middlewares/authMiddleware";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/properties");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(null, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

router.use(authenticate);

router.get("/report", propertyController.generateReport);
router.post("/", upload.array("photos", 5), propertyController.createProperty);

// Fetch all images from a property
router.get("/:propertyId/images", propertyController.fetchAllImages);

// Fetch a single image from a property
router.get("/:propertyId/images/:imageId", propertyController.fetchSingleImage);

router.put(
  "/:propertyId/photos/:photoId",
  upload.single("file"),
  propertyController.editPhoto
);
router.delete("/:propertyId/photos/:photoId", propertyController.deletePhoto);

router.get("/", propertyController.getAllProperties);
router.get("/:id", propertyController.getPropertyById);
router.put("/:id", upload.single("photo"), propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);

export default router;
