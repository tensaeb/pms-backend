import express from "express";
import { admin, authenticate, superAdmin } from "../middlewares/authMiddleware";
import { userController } from "../controllers/user.controller";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadMiddleware } from "../middlewares/upload.middleware";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/profiles");
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

// Route to create SuperUser (only when the database is empty)
router.post("/create-superuser", userController.createSuperUser);

// Route to initiate forgot password
router.post("/forgot-password", userController.forgotPassword);

// New route to reset password with code
router.post(
  "/:email/reset-password-code",
  userController.resetPasswordWithCode
);

// New route to get user status by email
router.post("/status/email", userController.getUserStatusByEmail);

// CREATE new user (Only Admin or SuperAdmin)
router.post(
  "/admin",
  authenticate,
  superAdmin,
  upload.single("photo"),
  userController.createAdmin
);
router.post(
  "/superadmin",
  authenticate,
  superAdmin,
  upload.single("photo"),
  userController.createSuperAdmin
);

router.post(
  "/",
  authenticate,
  // admin,
  upload.single("photo"),
  userController.createUser
);

router.get(
  "/registered-users",
  authenticate,
  userController.getUsersRegisteredBy
);

//GET users with role
router.get("/admin", authenticate, userController.getAdminUsers);
router.get("/super-admin", authenticate, userController.getSuperAdminUsers);
router.get("/user", authenticate, userController.getUsers);
router.get("/", authenticate, userController.getAllUsers);
router.get("/all-items", authenticate, userController.getUserItems);
router.get("/:userId/permissions", userController.updatePermissions);

// Get users by registeredBy ID
router.get(
  "/registeredBy/:registeredBy",
  authenticate,
  userController.getUsersByRegisteredBy
);
router.get(
  "/registeredBy/users/:registeredBy",
  authenticate,
  userController.getUserRoleUsingRegisteredBy
);

// Get maintainers by registeredBy ID
router.get(
  "/registeredBy/:registeredBy/maintainers",
  authenticate,
  userController.getMaintainersByRegisteredBy
);

// Get inspectors by registeredBy ID
router.get(
  "/registeredBy/:registeredBy/inspectors",
  authenticate,
  userController.getInspectorsByRegisteredBy
);

router.post("/:id/photo", uploadMiddleware, userController.uploadPhoto);
router.delete("/:id/photo", authenticate, userController.deletePhoto);
router.get("/:id/photo", userController.getPhoto);

router.put("/:userId/reset-password", userController.resetPassword);

// Update permissions
router.put(
  "/:userId/permissions",
  authenticate,
  userController.updatePermissions
);

router.get("/:id", authenticate, userController.getUserById);
router.put(
  "/:id",
  authenticate,
  upload.single("photo"),
  userController.updateUserById
);

// Route to delete a user with all connections
router.delete(
  "/delete/:id",
  authenticate,
  userController.deleteUserWithConnections
);
router.delete("/:id", authenticate, userController.deleteUser);
// New route for recursive user inactivation
router.put(
  "/deactivate-recursive/:userId",
  authenticate,
  userController.recursivelyInactiveUsers
);

export default router;
