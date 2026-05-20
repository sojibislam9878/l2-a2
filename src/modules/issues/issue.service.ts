import { sql } from "../../db"
import type { IResUser, TCreateIssue } from "../../types/types";
import { decodeToken } from "../../utils/jwt";

const createIssueDB = async (payload: TCreateIssue , authorization: string)=>{
    

    const decode = decodeToken(authorization) as IResUser

    const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `
    const user = userData[0] 

    if (userData.length <= 0) {
        throw new Error("User not exsist")
    }

    if (!user) {
        throw new Error("User not exsist")
    }

        

    const {title, description, type}= payload;
    if (description.length < 9) {
        throw new Error("Description is too short")
    }
    const result = await sql  `
      INSERT INTO issues(title, description, type, reporter_id)
      VALUES(${title}, ${description}, ${type}, ${user.id})
      RETURNING *
    `;
    return result
}

export const issueService = {
    createIssueDB
}