import { sql } from "../../db";
import type { IResUser, TCreateIssue, Tquery } from "../../types/types";
import { decodeToken } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import type { IIssueWithReporter, IResIssue } from "./issue.interfes";

const createIssueDB = async (payload: TCreateIssue, authorization: string) => {
  const decode = decodeToken(authorization) as IResUser;

  const { title, description, type, status = "open" } = payload;
  if (!title || !description || !type) {
    throw new AppError(400, "Title, description and type are required")
  }

  const userData = await sql`
    SELECT * FROM users WHERE id = ${decode.id} 
  `;

  if (!userData[0]) {
    throw new AppError(401, "Unauthorized user");
  }

  const user = userData[0];

  if (!user) {
    throw new AppError(401, "Unauthorized user");
  }

  if (title.length > 150) {
    throw new AppError(400, "Title is too long");
  }
  if (description.length < 20) {
    throw new AppError(400, "Description is too short (minimum 20 characters)");
  }

  if (type !== "bug" && type !=="feature_request") {
    throw new AppError(400, "Type must be either 'bug' or 'feature_request'")
  }

  if (status) {
    if (status !== "open" && status !== "in_progress" && status !== "resolved") {
      throw new AppError(400, "Status must be 'open' , 'in_progress' or 'resolved'")
    }
  }

  const result = await sql`
      INSERT INTO issues(title, description, type, reporter_id, status)
      VALUES(${title}, ${description}, ${type}, ${user.id} , ${status})
      RETURNING *
    `;

  if (!result[0]) {
    return;
  }

  const { password, ...userWithoutPassword } = result[0];

  return userWithoutPassword;
};
const getAllIssuesDB = async (query: Tquery) => {
  const { sort, type, status } = query;
  const conditions = [];
  if (type) conditions.push(sql`type = ${type}`);
  if (status) conditions.push(sql`status = ${status}`);

  const orderBy = sort === "oldest" ? sql`created_at ASC` : sql`created_at DESC`;
  const issues = await sql`
  SELECT
  issues.id,
  issues.title,
  issues.description,
  issues.type,
  issues.status,
  json_build_object(
    'id', users.id,
    'name', users.name,
    'role', users.role
  ) AS reporter,
   issues.created_at,
   issues.updated_at
  FROM issues
  JOIN users ON users.id = issues.reporter_id
  ${conditions.length ? sql`WHERE ${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : sql``}
  ORDER BY ${orderBy}
`;
return issues
};


const getIssueDB = async (id : string): Promise<IIssueWithReporter> =>{
  const issue = await sql  `
    SELECT
      issues.id,
      issues.title,
      issues.description,
      issues.type,
      issues.status,
      json_build_object(
        'id', users.id,
        'name', users.name,
        'role', users.role
      ) AS reporter,
      issues.created_at,
      issues.updated_at
    FROM issues
    JOIN users ON users.id = issues.reporter_id
    WHERE issues.id = ${id}
  `
  if (issue.length === 0) {
    throw new AppError(404, "Issue not found")
  }

  return issue[0] as IIssueWithReporter
}


const updateIssueDB = async (token: string, id: string, payload: {title: string, description:string, type: string})=>{
  const {title, description, type} = payload;

  if (!token) {
    throw new AppError(401, "Unauthorized")
  }

  const decode = decodeToken(token) as IResUser;
  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `;
  const issueData = await sql`
    SELECT * FROM issues WHERE id = ${id} 
    `;

  const user = userData[0];
  const issue = issueData[0];

  if (description.length < 19) {
    throw new AppError(400, "Description is too short (minimum 20 characters)");
  }

  if (!user) {
    throw new AppError(401, "Unauthorized user");
  }
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  if (user.role !== "maintainer") {
    if (issue.reporter_id !== user.id) {
      throw new AppError(403, "You don't have update access");
    }
    if (issue.status !== "open") {
      throw new AppError(409, "Cannot edit an issue that is not open");
    }
  }
  
  const result= await sql`
  UPDATE issues
  SET 
  title = COALESCE(${title}, title),
  description = COALESCE(${description}, description),
  type = COALESCE(${type}, type),
  updated_at = NOW()
  WHERE id = ${id}
  RETURNING *
  `
  return result[0] as IResIssue

}


const deleteIssueDB = async (token: string, id: string)=>{
if (!token) {
    throw new AppError(401, "Unauthorized")
  }
  const decode = decodeToken(token) as IResUser;
  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `;
    const issueData = await sql`
    SELECT * FROM issues WHERE id = ${id} 
    `;

  const issue = issueData[0];
  const user = userData[0];

  if (!user) {
    throw new AppError(401, "Unauthorized user");
  }
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }
  if (user.role !== "maintainer") {
    throw new AppError(403, "You don't have delete access");
  }
  const result = await sql `
      DELETE FROM issues
      WHERE id = ${id}
      RETURNING *;
      `
  return result
}


export const issueService = {
  createIssueDB,
  getAllIssuesDB,
  getIssueDB,
  updateIssueDB, 
  deleteIssueDB
};
