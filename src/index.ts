// server.ts
import { httpServer } from "./app"; // Make sure this is imported
import "reflect-metadata";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4000; // Changed default to 4000 to match frontend

// Use httpServer instead of app.listen()
httpServer.listen(PORT, () => {
  console.log("====================================");
  console.log(`Server listening on port ${PORT}`);
  console.log("====================================");
});
