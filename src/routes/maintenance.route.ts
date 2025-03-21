import express from "express";
import multer from "multer";
import { maintenanceController } from "../controllers/maintenance.controller";
import { admin, authenticate } from "../middlewares/authMiddleware";
import path from "path";

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
// Route for generating maintenance report
router.get("/report", admin, maintenanceController.generateReport);

// Create a new maintenance request
router.post(
  "/",
  upload.array("requestedFiles", 5),
  maintenanceController.createMaintenanceRequest
);

// Approve a maintenance request
router.put(
  "/approve/:id",
  admin,
  maintenanceController.approveMaintenanceRequest
);

// Assign a maintainer to a maintenance request
router.put("/assign/:id", admin, maintenanceController.assignMaintainer);

// Get all maintenance requests assigned to a maintainer
router.get(
  "/maintainer/:maintainerId",
  maintenanceController.getMaintenancesByMaintainer
);
// Get list of maintainers
router.get("/maintainers", admin, maintenanceController.getMaintainersList);

// New route: Get completed maintenance requests with an optional maintainer ID
router.get(
  "/completed/:maintainerId?",
  maintenanceController.getCompletedMaintenances
);

// Maintainer submits maintenance expense
router.put("/expense/:id", maintenanceController.submitMaintenanceExpense);
// Inspector Inspects Maintenance and mark as inspected
router.put(
  "/inspect/:id",
  upload.array("inpectedFiles", 5),
  maintenanceController.inspectMaintenance
);
// Get all maintenance requests
router.get("/", maintenanceController.getAllMaintenanceRequests);

// Get a single maintenance request by ID
router.get("/:id", maintenanceController.getMaintenanceById);

// Update a maintenance request
router.put(
  "/:id",
  upload.array("requestedFiles", 5),
  maintenanceController.updateMaintenance
);

// Delete a maintenance request
router.delete("/:id", admin, maintenanceController.deleteMaintenance);

router.get(
  "/registered/:userId",
  maintenanceController.getMaintenanceRequestsByRegisteredUser
);

router.get(
  "/tenant/:tenantId",
  maintenanceController.getMaintenancesByTenantId
);

router.get(
  "/inspectedBy/:inspectedBy",
  maintenanceController.getMaintenancesByInspectedBy
);

router.get(
  "/assigned/:assignedMaintainer",
  maintenanceController.getMaintenancesByAssignedMaintainer
);

router.get(
  "/registered-by-admin/:registeredByAdmin",
  maintenanceController.getMaintenancesByRegisteredByAdmin
);

// Get total expenses for maintenances registered by a user
router.get(
  "/expenses/registered/:registeredBy",
  maintenanceController.getTotalExpensesByRegisteredBy
);

// Get total expenses for maintenances registered by a user
router.get(
  "/expenses/registered-by-admin/:registeredByAdmin",
  admin, // or appropriate auth
  maintenanceController.getTotalExpensesByRegisteredByAdmin
);

// NEW ROUTE: Get maintenance status counts by registeredBy
router.get(
  "/statusCounts/:registeredBy",
  authenticate,
  maintenanceController.getMaintenanceStatusCounts
);

// Serve static files from the 'uploads' directory
router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export default router;
