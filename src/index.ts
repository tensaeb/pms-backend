import { app } from "./app";
import "reflect-metadata";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log(`Server listening on port ${PORT}`);
  console.log("====================================");
});
