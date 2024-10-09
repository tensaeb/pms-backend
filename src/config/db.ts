import { MongoClient, ServerApiVersion } from "mongodb";
import { config } from "dotenv";
config();

const mongoUri = process.env.MONGO_URI as string;
const dbName = process.env.DB_NAME as string; // Define your database name here

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const connectDB = async (): Promise<void> => {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Use the database name you specified
    const db = client.db(dbName);

    // Send a ping to confirm a successful connection
    await db.command({ ping: 1 });

    console.log("Successfully connected to database");
  } catch (error: any) {
    console.error(`Error connecting to database: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// Optionally close the client when you finish your operations
export const closeDB = async (): Promise<void> => {
  try {
    await client.close();
    console.log("MongoDB connection closed.");
  } catch (error: any) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};
