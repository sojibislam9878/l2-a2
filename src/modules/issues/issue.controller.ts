import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { issueService } from "./issue.service";
import type { IResIssue } from "./issue.interfes";

const createIssue = async (req: Request, res: Response) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      sendResponse(
        res,
        {
          message: "Unauthorized",
          error: {},
        },
        401,
      );
      return;
    }

    const issue = await issueService.createIssueDB(req.body, authorization);

    sendResponse(
      res,
      {
        message: "Issue created successfully",
        data: issue,
      },
      201,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";

    console.log(error);

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

const getAllIssues = async (req: Request, res: Response) => {
  try {
    const querys = req.query

    const result = await issueService.getAllIssuesDB(querys);
    sendResponse(
      res,
      {
        data: result,
      },
      200,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";

    console.log(error);

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

export const issueController = {
  createIssue,
  getAllIssues,
};
