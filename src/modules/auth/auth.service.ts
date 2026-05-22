import { sql } from "../../db";
import type { IResUser, IUser } from "../../types/types";
import bcrypt from "bcrypt";
import { signTokes } from "../../utils/jwt";
const signupDB = async (payload: IUser) => {
  const { name, email, password: reqPass, role } = payload;

  if (role) {
    if (role !== "contributor" && role !== "maintainer") {
      throw new Error("Role must be 'contributor' or 'maintainer'");
    }
  }
  if (!name || !email || !reqPass) {
    throw new Error("Fill all field properly");
  }

  const hashPass = await bcrypt.hash(reqPass, 12);
  const result = await sql`
      INSERT INTO users(name, email, password, role)
      VALUES(${name}, ${email}, ${hashPass}, ${role})
      RETURNING *
    `;

  const user = result[0] as IUser;
  const { password, ...userWithoutPass } = user;
  return userWithoutPass;
};

const loginDB = async (payload: { email: string; password: string }) => {
  const { email: reqEmail, password } = payload;
  if (!reqEmail || !password) {
    throw new Error("Inter Email and Password");
  }
  const userData = await sql`
    SELECT * FROM users
    WHERE email = ${reqEmail};
  `;

  const user = userData[0] as IUser;

  if (!user) {
    throw new Error("User not found");
  }
  const hashPass = user.password;
  const isValidPassword = await bcrypt.compare(password, hashPass);

  if (!isValidPassword) {
    throw new Error("Wrong password");
  }

  const { password: userPass, ...userWithoutPassword } = user;
  const { token } = signTokes(user);
  const result = { token, user: userWithoutPassword };
  return result;
};

export const authService = {
  signupDB,
  loginDB,
};
