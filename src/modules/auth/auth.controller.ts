import type { Request, Response } from "express";
import { authService } from "./auth.service";
import type { IUser } from "../../types/types";
import { sendResponse } from "../../utils/sendResponse";

const signup = async (req: Request, res: Response) => {
  try {
    const result = await authService.signupDB(req.body as IUser);
    sendResponse(res,{message: "User registered successfully",data: result},201);

  } catch (error) {
    const errorMessage =error instanceof Error ? error.message : "Something went wrong";
    sendResponse(res,{message: errorMessage,error: error,},500,);
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginDB(req.body);

    sendResponse(
      res,
      {
        message: "User login successfully",
        data: result,
      },
      201,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";

    sendResponse(
      res,
      {
        message: errorMessage,
        error: error,
      },
      500,
    );
  }
};

export const authController = {
  signup,
  login,
};
