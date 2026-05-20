import type { Request, Response } from "express";
import { authService } from "./auth.service";
import type { IResUser, IUser } from "../../types/types";
import { sendResponse } from "../../utils/sendResponse";

const signup = async (req: Request, res: Response) => {
  try {
    const result = await authService.signupDB(req.body as IUser);

    const { id, name, email, role, created_at, updated_at } =
      result[0] as IResUser;

    const userData = {
      id,
      name,
      email,
      role,
      created_at,
      updated_at,
    };

    sendResponse(
      res,
      {
        message: "User registered successfully",
        data: userData,
      },
      201,
    );
  } catch (error) {
    sendResponse(
      res,
      {
        message: "Registration failed",
        error,
      },
      500,
    );
  }
};

export const authController = {
  signup,
};
