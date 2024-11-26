import express from "express";
import { admin, authenticate, superAdmin } from "../middlewares/authMiddleware";
import { userController } from "../controllers/user.controller";

const router = express.Router();

// Route to create SuperUser (only when the database is empty)
router.post("/create-superuser", userController.createSuperUser);

// CREATE new user (Only Admin or SuperAdmin)
router.post("/admin", authenticate, superAdmin, userController.createAdmin);
router.post(
  "/superadmin",
  authenticate,
  superAdmin,
  userController.createSuperAdmin
);
router.post("/", authenticate, admin, userController.createUser);

//GET users with role
router.get("/admin", authenticate, userController.getAdminUsers);
router.get("/super-admin", authenticate, userController.getSuperAdminUsers);
router.get("/user", authenticate, userController.getUsers);
router.get("/", authenticate, userController.getAllUsers);

// Update permissions
router.put(
  "/:userId/permissions",
  authenticate,
  admin,
  userController.updatePermissions
);

router.get("/:id", authenticate, userController.getUserById);
router.put("/:id", authenticate, userController.updateUserById);
router.delete("/:id", authenticate, userController.deleteUser);

export default router;
