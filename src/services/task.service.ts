// services/task.service.ts
import { ITask } from "../interfaces/task.interface";
import { Task } from "../models/task.model";
import logger from "../utils/logger";
import mongoose from "mongoose";

class TaskService {
  public async createTask(
    taskData: Partial<ITask>,
    user?: string
  ): Promise<ITask> {
    try {
      const newTask = new Task({ ...taskData, createdBy: user });
      const savedTask = await newTask.save();
      logger.info(`Task created with ID: ${savedTask._id}`);
      return savedTask;
    } catch (error) {
      logger.error(`Error creating task: ${error}`);
      throw error;
    }
  }

  public async getTaskById(id: string): Promise<ITask | null> {
    try {
      const task = await Task.findById(id)
        .populate("assignedTo")
        .populate("property")
        .populate("maintenanceRequest");
      if (!task) {
        logger.warn(`Task with ID ${id} not found.`);
        return null;
      }
      logger.info(`Retrieved task with ID: ${id}`);
      return task;
    } catch (error) {
      logger.error(`Error getting task by ID ${id}: ${error}`);
      throw error;
    }
  }

  public async updateTask(
    id: string,
    updateData: Partial<ITask>
  ): Promise<ITask | null> {
    try {
      const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate("assignedTo")
        .populate("property")
        .populate("maintenanceRequest");
      if (!updatedTask) {
        logger.warn(`Task with ID ${id} not found for updating.`);
        return null;
      }
      logger.info(`Task with ID ${id} updated successfully.`);
      return updatedTask;
    } catch (error) {
      logger.error(`Error updating task ${id}: ${error}`);
      throw error;
    }
  }

  public async deleteTask(id: string): Promise<ITask | null> {
    try {
      const deletedTask = await Task.findByIdAndDelete(id);
      if (!deletedTask) {
        logger.warn(`Task with ID ${id} not found for deletion.`);
        return null;
      }
      logger.info(`Task with ID ${id} deleted successfully.`);
      return deletedTask;
    } catch (error) {
      logger.error(`Error deleting task ${id}: ${error}`);
      throw error;
    }
  }

  public async getTasksForMaintainer(
    maintainerId: string,
    query: any
  ): Promise<{
    tasks: Partial<ITask>[];
    totalPages: number;
    currentPage: number;
    totalTasks: number;
  }> {
    try {
      const { page = 1, limit = 10, status } = query;
      const limitNumber = Number(limit) || 10;
      const skip = (page - 1) * limitNumber;
      // 1. Validate that maintainerId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(maintainerId)) {
        logger.warn(`Invalid maintainerId provided.`);
        return {
          tasks: [],
          totalPages: 0,
          currentPage: Number(page),
          totalTasks: 0,
        };
      }
      const searchQuery: any = {
        assignedTo: maintainerId,
      };
      if (status) {
        searchQuery.status = status;
      }
      const [tasks, totalTasks] = await Promise.all([
        Task.find(searchQuery)
          .populate("assignedTo")
          .populate("property")
          .populate("maintenanceRequest")
          .skip(skip)
          .limit(limitNumber),
        Task.countDocuments(searchQuery),
      ]);

      logger.info(
        `Retrieved ${tasks.length} tasks for maintainer ${maintainerId} (page ${page}, limit ${limit}, status "${status}"). Total tasks: ${totalTasks}`
      );

      return {
        tasks,
        totalPages: Math.ceil(totalTasks / limitNumber),
        currentPage: Number(page),
        totalTasks,
      };
    } catch (error) {
      logger.error(`Error getting tasks for maintainer: ${error}`);
      throw error;
    }
  }

  public async finishTask(taskId: string): Promise<ITask | null> {
    try {
      const finishedTask = await Task.findByIdAndUpdate(
        taskId,
        {
          status: "completed",
          completedDate: new Date(),
        },
        { new: true } // Return the updated document
      )
        .populate("assignedTo")
        .populate("property")
        .populate("maintenanceRequest");

      if (!finishedTask) {
        logger.warn(`Task with ID ${taskId} not found for finishing.`);
        return null;
      }
      logger.info(`Task with ID ${taskId} marked as completed.`);
      return finishedTask;
    } catch (error) {
      logger.error(`Error finishing task ${taskId}: ${error}`);
      throw error;
    }
  }

  // New service functions
  public async getAllTasks(query: any): Promise<{
    tasks: Partial<ITask>[];
    totalPages: number;
    currentPage: number;
    totalTasks: number;
  }> {
    try {
      const { page = 1, limit = 10 } = query;
      const limitNumber = Number(limit) || 10;
      const skip = (page - 1) * limitNumber;

      const [tasks, totalTasks] = await Promise.all([
        Task.find({})
          .populate("assignedTo")
          .populate("property")
          .populate("maintenanceRequest")
          .populate("createdBy")
          .skip(skip)
          .limit(limitNumber),
        Task.countDocuments({}),
      ]);

      logger.info(
        `Retrieved ${tasks.length} tasks (page ${page}, limit ${limit}). Total tasks: ${totalTasks}`
      );

      return {
        tasks,
        totalPages: Math.ceil(totalTasks / limitNumber),
        currentPage: Number(page),
        totalTasks,
      };
    } catch (error) {
      logger.error(`Error getting all tasks: ${error}`);
      throw error;
    }
  }

  public async getTasksByCreatedBy(
    createdBy: string,
    query: any
  ): Promise<{
    tasks: Partial<ITask>[];
    totalPages: number;
    currentPage: number;
    totalTasks: number;
  }> {
    try {
      const { page = 1, limit = 10 } = query;
      const limitNumber = Number(limit) || 10;
      const skip = (page - 1) * limitNumber;

      // Validate createdBy is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        logger.warn(`Invalid createdBy ID provided.`);
        return {
          tasks: [],
          totalPages: 0,
          currentPage: Number(page),
          totalTasks: 0,
        };
      }

      const searchQuery = { createdBy: createdBy };
      const [tasks, totalTasks] = await Promise.all([
        Task.find(searchQuery)
          .populate("assignedTo")
          .populate("property")
          .populate("maintenanceRequest")
          .populate("createdBy")
          .skip(skip)
          .limit(limitNumber),
        Task.countDocuments(searchQuery),
      ]);

      logger.info(
        `Retrieved ${tasks.length} tasks for createdBy ${createdBy} (page ${page}, limit ${limit}). Total tasks: ${totalTasks}`
      );

      return {
        tasks,
        totalPages: Math.ceil(totalTasks / limitNumber),
        currentPage: Number(page),
        totalTasks,
      };
    } catch (error) {
      logger.error(`Error getting tasks by createdBy: ${error}`);
      throw error;
    }
  }
}

export const taskService = new TaskService();
