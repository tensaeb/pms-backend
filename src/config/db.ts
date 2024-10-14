import mongoose from "mongoose";
import { config } from "dotenv";
config();

const mongoUri = process.env.MONGO_URI as string;

export const connectDB = async (): Promise<void> => {
  try {
    // Mongoose connection to MongoDB
    await mongoose.connect(mongoUri);

    console.log("Successfully connected to MongoDB with Mongoose");
  } catch (error: any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// Optionally close the connection
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("Mongoose connection closed.");
  } catch (error: any) {
    console.error(`Error closing Mongoose connection: ${error.message}`);
  }
};
