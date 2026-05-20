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

    const result = (await issueService.createIssueDB(
      req.body,
      authorization,
    )) as IResIssue[];
    if (!result[0]) {
      return;
    }
    const {
      id,
      title,
      description,
      type,
      status,
      reporter_id,
      created_at,
      updated_at,
    } = result[0];
    const issue = {
      id,
      title,
      description,
      type,
      status,
      reporter_id,
      created_at,
      updated_at,
    };

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

export const issueController = {
  createIssue,
};
