import bodyParser from "body-parser";
import express, { Application, Request, Response } from "express";
import router from "./routes";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/db";
import { createServer } from "http"; // Import createServer
import { Server } from "socket.io"; // Import Socket.IO Server

// Import the scheduler
import "./schedulers/leaseScheduler";

class App {
  public app: Application;
  public httpServer: any; // Add httpServer
  public io: Server; // Add io

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app); // Create HTTP server
    this.io = new Server(this.httpServer, {
      // Initialize Socket.IO
      cors: {
        origin: "*", // Allow all origins during development
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      },
    });

    this.config();
    this.routes();
    this.connectDatabase();
    this.setupSocketIO(); // Initialize and setup socket io
  }

  private config(): void {
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(cors()); // Enable CORS middleware
  }

  private routes(): void {
    this.app.use("/api/v1", router);
    this.app.get("/", (req: Request, res: Response) => {
      res.send("Welcome to BETA PMS!!!");
    });
  }

  public async connectDatabase(): Promise<void> {
    await connectDB();
    console.log("starting scheduler");
    require("./schedulers/leaseScheduler");
  }

  private setupSocketIO(): void {
    this.app.set("socketio", this.io);

    this.io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("join", (recipientId) => {
        socket.join(recipientId);
        console.log(`User joined room: ${recipientId}`);
      });

      socket.on("disconnect", () => {
        console.log("A user disconnected");
      });
    });
  }
}

const appInstance = new App();
export const app = appInstance.app;
export const httpServer = appInstance.httpServer; // Export httpServer
export const io = appInstance.io; // Export the Socket.IO instance
export default appInstance;
