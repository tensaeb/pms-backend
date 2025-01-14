// complaint.route.ts
import express from "express";
import multer from "multer";
import { complaintController } from "../controllers/complaint.controller";
import { admin, authenticate } from "../middlewares/authMiddleware";
import path from "path";

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
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
  limits: { fileSize: 300 * 1024 * 1024 },
});

router.use(authenticate);

router.post(
  "/",
  upload.array("supportingFiles", 5),
  complaintController.createComplaint
);
router.get("/", complaintController.getAllComplaints);
router.get("/:id", complaintController.getComplaintById);
router.put("/assign/:id", admin, complaintController.assignComplaint);
router.put("/feedback/:id", complaintController.submitComplaintFeedback);
router.put("/:id", complaintController.updateComplaint);
router.delete("/:id", complaintController.deleteComplaint);
router.get(
  "/assigned/:userId",
  complaintController.getComplaintsByAssignedUser
);
router.get(
  "/unassigned/complaints",
  admin,
  complaintController.getUnassignedComplaints
);

router.get(
  "/registered/:userId",
  complaintController.getComplaintsByRegisteredUser
);

router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
export default router;
