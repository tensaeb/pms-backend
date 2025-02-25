// controllers/task.controller.ts
import { Request, Response } from "express";
import { taskService } from "../services/task.service";
import { errorResponse, successResponse } from "../utils/apiResponse";

class TaskController {
  public async createTask(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any)?.user?._id;
      const newTask = await taskService.createTask(req.body, user);
      res
        .status(201)
        .json(successResponse(newTask, "Task created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create task"));
    }
  }

  public async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        res.status(404).json(errorResponse("Task not found"));
        return;
      }
      res.status(200).json(successResponse(task, "Task fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch task"));
    }
  }

  public async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const updatedTask = await taskService.updateTask(req.params.id, req.body);
      if (!updatedTask) {
        res.status(404).json(errorResponse("Task not found"));
        return;
      }
      res
        .status(200)
        .json(successResponse(updatedTask, "Task updated successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update task"));
    }
  }

  public async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const deletedTask = await taskService.deleteTask(req.params.id);
      if (!deletedTask) {
        res.status(404).json(errorResponse("Task not found"));
        return;
      }
      res
        .status(200)
        .json(successResponse(deletedTask, "Task deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete task"));
    }
  }

  public async getTasksForMaintainer(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { maintainerId } = req.params;
      const query = req.query;
      const tasks = await taskService.getTasksForMaintainer(
        maintainerId,
        query
      );
      res
        .status(200)
        .json(
          successResponse(tasks, "Tasks for maintainer fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch tasks for maintainer")
        );
    }
  }

  public async finishTask(req: Request, res: Response): Promise<void> {
    try {
      const updatedTask = await taskService.finishTask(req.params.id);
      if (!updatedTask) {
        res.status(404).json(errorResponse("Task not found"));
        return;
      }
      res
        .status(200)
        .json(successResponse(updatedTask, "Task marked as completed"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to finish task"));
    }
  }

  // New controller methods
  public async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query;
      const tasks = await taskService.getAllTasks(query);
      res
        .status(200)
        .json(successResponse(tasks, "All tasks fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch all tasks"));
    }
  }

  public async getTasksByCreatedBy(req: Request, res: Response): Promise<void> {
    try {
      const { createdBy } = req.params;
      const query = req.query;
      const tasks = await taskService.getTasksByCreatedBy(createdBy, query);
      res
        .status(200)
        .json(
          successResponse(tasks, "Tasks fetched by createdBy successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch tasks by createdBy")
        );
    }
  }
}

export const taskController = new TaskController();
