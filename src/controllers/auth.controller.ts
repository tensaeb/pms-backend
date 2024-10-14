import { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.services";
import { errorResponse, successResponse } from "../utils/apiResponse";

class AuthController {
  // Login user
  async loginUser(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    try {
      const { token, refreshToken, user } = await authService.loginUser(
        email,
        password
      );
      res
        .status(200)
        .json(
          successResponse({ token, refreshToken, user }, "Login successful")
        );
    } catch (error: any) {
      res.status(401).json(errorResponse(error.message, "Login failed"));
    }
  }

  // Refresh token
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    try {
      const newAccessToken = await authService.refreshToken(refreshToken);
      res
        .status(200)
        .json(
          successResponse(
            { token: newAccessToken },
            "Token refreshed successfully"
          )
        );
    } catch (error: any) {
      res
        .status(403)
        .json(errorResponse(error.message, "Invalid refresh token"));
    }
  }
  // Request password reset
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      await authService.requestPasswordReset(req.body.email);
      res
        .status(200)
        .json(successResponse(null, "Password reset code sent successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to send password reset code")
        );
    }
  }
}

export const authController = new AuthController();
