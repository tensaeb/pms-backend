// routes/tasks.routes.ts;
import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { taskController } from "../controllers/task.controller";

const router = express.Router();

router.use(authenticate);

// Admin routes (creating and deleting tasks)
router.post("/", taskController.createTask);
router.get("/all", taskController.getAllTasks);

router.get("/createdBy/:createdBy", taskController.getTasksByCreatedBy);
// Maintainer route (fetching and updating tasks assigned to them)
router.get("/maintainer/:maintainerId", taskController.getTasksForMaintainer);
router.get("/:id", taskController.getTaskById);
router.put("/:id", taskController.updateTask);
router.put("/:id/finish", taskController.finishTask);

router.delete("/:id", taskController.deleteTask);

export default router;
