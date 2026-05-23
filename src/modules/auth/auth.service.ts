import { sql } from "../../db";
import type { IResUser, IUser } from "../../types/types";
import bcrypt from "bcrypt";
import { signTokes } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
const signupDB = async (payload: IUser) => {
  const { name, email, password: reqPass, role = "contributor" } = payload;
  if (role) {
    if (role !== "contributor" && role !== "maintainer") {
      throw new AppError(400, "Role must be 'contributor' or 'maintainer'");
    }
  }
  if (!name || !email || !reqPass) {
    throw new AppError(400, "Name, email and password are required");
  }

  const hashPass = await bcrypt.hash(reqPass, 12);

  try {
    const result = await sql`
        INSERT INTO users(name, email, password, role)
        VALUES(${name}, ${email}, ${hashPass}, ${role})
        RETURNING *
      `;

    const user = result[0] as IUser;
    const { password, ...userWithoutPass } = user;
    return userWithoutPass;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      throw new AppError(400, "Email already exists");
    }
    throw err;
  }
};

const loginDB = async (payload: { email: string; password: string }) => {
  const { email: reqEmail, password } = payload;
  if (!reqEmail || !password) {
    throw new AppError(400, "Email and password are required");
  }
  const userData = await sql`
    SELECT * FROM users
    WHERE email = ${reqEmail};
  `;

  const user = userData[0] as IUser;

  if (!user) {
    throw new AppError(404, "User not found");
  }
  const hashPass = user.password;
  const isValidPassword = await bcrypt.compare(password, hashPass);

  if (!isValidPassword) {
    throw new AppError(401, "Invalid credentials");
  }

  if(!user.id){
    throw new AppError(500, "user id missing")
  }

  const { password: userPass, ...userWithoutPassword } = user;
  const { token } = signTokes({id: user.id , name:user.name, role:user.role});
  const result = { token, user: userWithoutPassword };
  return result;
};

export const authService = {
  signupDB,
  loginDB,
};
