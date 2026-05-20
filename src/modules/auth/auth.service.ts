import { sql } from "../../db"
import type { IUser } from "../../types/types"
import bcrypt from "bcrypt"
import { signTokes } from "../../utils/jwt"
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
const loginDB =async (payload: {email: string, password: string}) =>{
  const { email: reqEmail, password } = payload;

  const userData = await sql`
    SELECT * FROM users
    WHERE email = ${reqEmail};
  `;

  const user = userData[0];

  if (!user) {
    throw new Error("User not found");
  }

  const hashPass = user.password;

  const isValidPassword = await bcrypt.compare(
    password,
    hashPass
  );

  if (!isValidPassword) {
    throw new Error("Wrong password");
  }
  const {id, name, email, role, created_at, updated_at} = user
  const userWithoutPassword = {
    id, name, email, role, created_at, updated_at
  }
  const {token} = signTokes(user)

  const result = { token, user: userWithoutPassword};
  return result
};

export const authService = {
    signupDB,
    loginDB
}