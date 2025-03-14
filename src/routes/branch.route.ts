// src/routes/branch.route.ts
import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { branchController } from "../controllers/branch.controller";

const router = express.Router();

router.post("/", authenticate, branchController.createBranch);
router.get("/", authenticate, branchController.getAllBranches);
router.get("/:id", authenticate, branchController.getBranchById);
router.put("/:id", authenticate, branchController.updateBranch);
router.delete("/:id", authenticate, branchController.deleteBranch);

export default router;
