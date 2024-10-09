// src/types/custom.d.ts

import { IUser } from "../interfaces/user.interface";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Add user to the request object
    }
  }
}
