import bodyParser from "body-parser";
import express, { Application, Request, Response } from "express";
import router from "./routes";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/db";
// Import the scheduler
import "./schedulers/leaseScheduler"; // <---- Import and execute scheduler
// import { startLeaseScheduler } from './schedulers/leaseScheduler';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.connectDatabase();
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

    // this.app.get("/api-docs", (req: Request, res: Response) => {
    //   res.redirect("https://documenter.getpostman.com/view/6379484/2sAXqtc2G5");
    // });

    //Serve static files from the 'uploads directory
    // const uploadsDir = getUploadsDir();
    // this.app.use("/uploads", express.static(uploadsDir));
  }

  public async connectDatabase(): Promise<void> {
    await connectDB();

    // START THE SCHEDULER HERE RIGHT AFTER CONNECTION ESTABLISHED
    console.log("starting scheduler");
    require("./schedulers/leaseScheduler");
  }

  private middlewares(): void {
    // this.app.use(errorHandler); // Apply error handling
  }
}
const appInstance = new App();
export const app = appInstance.app;
export default appInstance;
