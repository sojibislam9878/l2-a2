import type { NextFunction, Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { issueService } from "./issue.service";
import type { IIssueWithReporter, IResIssue } from "./issue.interfes";
import { AppError } from "../../utils/AppError";

const createIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new AppError(401, "Unauthorized");
    }

    const issue = await issueService.createIssueDB(req.body, authorization);
    sendResponse(res,{message: "Issue created successfully",data: issue},201);

  } catch (error) {
    next(error);
  }
};

const getAllIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const result = await issueService.getAllIssuesDB(query);sendResponse(res,{message: "Issues retrived successfully",data: result},200);

  } catch (error) {
    next(error);
  }
};

const getIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new AppError(400, "Invalid ID");
    }

    const result:IIssueWithReporter = await issueService.getIssueDB(id);
    sendResponse( res,{message: "Issues retrived successfully", data: result},200);

  } catch (error) {
    next(error);
  }
};

const updateIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization;
    const {id} = req.params;
    const payload = req.body;

    const result = await issueService.updateIssueDB(token as string , id as string, payload as { title: string, description: string; type: string;} );
    sendResponse( res,{message: "Issue updated successfully",data: result},200);

  } catch (error) {
    next(error);
  }
};

const deleteIssue =async (req:Request, res:Response, next: NextFunction)=>{
  try {
    const {id} = req.params;
    const token = req.headers.authorization;
    const result = await issueService.deleteIssueDB(token as string, id as string)
    console.log(result)
    sendResponse(res,{message: "Issue deleted successfully"},200);
  } catch (error) {
    next(error);
  }
}

export const issueController = {
  createIssue,
  getAllIssues,
  getIssue,
  updateIssue,
  deleteIssue
};
