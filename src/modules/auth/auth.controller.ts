import type { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";
import type { IUser } from "../../types/types";
import { sendResponse } from "../../utils/sendResponse";

const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.signupDB(req.body as IUser);
    sendResponse(res,{message: "User registered successfully",data: result},201);

  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.loginDB(req.body);
    sendResponse(res,{message: "Login successfully",data: result},200);

  } catch (error) {
    next(error);
  }
};

export const authController = {
  signup,
  login,
};
