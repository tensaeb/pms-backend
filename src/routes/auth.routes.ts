import express from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

// Auth routes
router.post("/login", authController.loginUser);
router.post("/refresh-token", authController.refreshToken);
router.post("/request-password-reset", authController.requestPasswordReset);

export default router;
