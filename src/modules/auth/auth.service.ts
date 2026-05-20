import { sql } from "../../db"
import type { IUser } from "../../types/types"
import bcrypt from "bcrypt"
const signupDB =async (payload: IUser) =>{
    const {name, email, password, role} = payload
    const hashPass = await bcrypt.hash(password, 12);
    const result = await sql `
      INSERT INTO users(name, email, password, role)
      VALUES(${name}, ${email}, ${hashPass}, ${role})
      RETURNING *
    `;
    return result
}

export const authService = {
    signupDB
}