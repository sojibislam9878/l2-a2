import { sql } from "../../db";
import type { IResUser, TCreateIssue, Tquery } from "../../types/types";
import { decodeToken } from "../../utils/jwt";
import type { IIssueWithReporter, IResIssue } from "./issue.interfes";

const createIssueDB = async (payload: TCreateIssue, authorization: string) => {
  const decode = decodeToken(authorization) as IResUser;

  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `;

  if (!userData[0]) {
    throw new Error("User not exsist");
  }

  const user = userData[0];

  if (!user) {
    throw new Error("User not exsist");
  }

  const { title, description, type } = payload;
  if (description.length < 9) {
    throw new Error("Description is too short");
  }
  const result = await sql`
      INSERT INTO issues(title, description, type, reporter_id)
      VALUES(${title}, ${description}, ${type}, ${user.id})
      RETURNING *
    `;

  if (!result[0]) {
    return;
  }

  const { password, ...userWithoutPassword } = result[0];

  return userWithoutPassword;
};
const getAllIssuesDB = async (querys: Tquery) => {
  const { sort, type, status } = querys;
  const conditions = [];
  if (type) conditions.push(sql`type = ${type}`);
  if (status) conditions.push(sql`status = ${status}`);

  const orderBy = sort === "old" ? sql`created_at ASC` : sql`created_at DESC`;
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
    throw new Error("Issue not found")
  }

  return issue[0] as IIssueWithReporter
}

const updateIssueDB = async (token: string, id: string, payload: {title: string, description:string, type: string})=>{
  const {title, description, type} = payload;
  if (!token) {
    throw new Error("Unauthorized")
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

  if (!user) {
    throw new Error("User not exsist");
  }
  if (!issue) {
    throw new Error("issue not fount");
  }
  if (user.role !== "maintainer" && (issue.reporter_id !== user.id || issue.status !== "open") ) {
    throw new Error("You don't have update access");
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
    throw new Error("Unauthorized")
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
    throw new Error("User not exsist");
  }
  if (!issue) {
    throw new Error("issue not found");
  }
  if (user.role !== "maintainer") {
    throw new Error("You don't have delete access");
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
