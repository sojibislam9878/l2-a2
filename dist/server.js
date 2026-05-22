
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import express from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/db/index.ts
import { neon } from "@neondatabase/serverless";

// src/db/schema.ts
var createSchema = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        name VARCHAR (150) NOT NULL,
        email VARCHAR (200) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR (20) NOT NULL DEFAULT 'contributor',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
     )
    
    `;
  await sql`
    CREATE TABLE IF NOT EXISTS issues(
        id SERIAL PRIMARY KEY,
        title VARCHAR (150) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR (20) NOT NULL,
        status VARCHAR (20) NOT NULL DEFAULT 'open',
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
     )
    
    `;
};

// src/config/envConfig.ts
import dotenv from "dotenv";
import Path from "path";
dotenv.config({ path: Path.join(process.cwd(), ".env") });
var envConfig = {
  port: process.env.PORT,
  db_url: process.env.DB_URL,
  access_token: process.env.ACCESS_TOKEN
};
var envConfig_default = envConfig;

// src/db/index.ts
var sql = neon(envConfig_default.db_url);
var initDB = async () => {
  await createSchema();
  console.log("Database connected successfully!");
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var signTokes = (payloads) => {
  const token = jwt.sign(payloads, envConfig_default.access_token, { expiresIn: "7d" });
  return { token };
};
var decodeToken = (payload) => {
  const decoded = jwt.verify(payload, envConfig_default.access_token);
  return decoded;
};

// src/modules/auth/auth.service.ts
var signupDB = async (payload) => {
  const { name, email, password: reqPass, role = "contributor" } = payload;
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
  const user = result[0];
  const { password, ...userWithoutPass } = user;
  return userWithoutPass;
};
var loginDB = async (payload) => {
  const { email: reqEmail, password } = payload;
  if (!reqEmail || !password) {
    throw new Error("Inter Email and Password");
  }
  const userData = await sql`
    SELECT * FROM users
    WHERE email = ${reqEmail};
  `;
  const user = userData[0];
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
var authService = {
  signupDB,
  loginDB
};

// src/utils/sendResponse.ts
var sendResponse = (res, { message, data, error }, status = 200) => {
  res.status(status).json({
    success: !error,
    message,
    data: error ? void 0 : data,
    error: error && error
  });
};

// src/modules/auth/auth.controller.ts
var signup = async (req, res) => {
  try {
    const result = await authService.signupDB(req.body);
    sendResponse(res, { message: "User registered successfully", data: result }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var login = async (req, res) => {
  try {
    const result = await authService.loginDB(req.body);
    sendResponse(res, { message: "Login successfully", data: result }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var authController = {
  signup,
  login
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
var authRouter = router;

// src/modules/issues/issue.route.ts
import { Router as Router2 } from "express";

// src/modules/issues/issue.service.ts
var createIssueDB = async (payload, authorization) => {
  const decode = decodeToken(authorization);
  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
  `;
  if (!userData[0]) {
    throw new Error("User not exist");
  }
  const user = userData[0];
  if (!user) {
    throw new Error("User not exist");
  }
  const { title, description, type, status = "open" } = payload;
  if (!title && !description && !type) {
    throw new Error("Give inputs properly");
  }
  if (description.length < 19) {
    throw new Error("Description is too short");
  }
  if (type !== "bug" && type !== "feature_request") {
    throw new Error("Type must be either 'bug' or 'feature_request'");
  }
  if (status) {
    if (status !== "open" && status !== "in_progress" && status !== "resolved") {
      throw new Error("Status must be 'open' , 'in_progress' or 'resolved'");
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
var getAllIssuesDB = async (query) => {
  const { sort, type, status } = query;
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
  return issues;
};
var getIssueDB = async (id) => {
  const issue = await sql`
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
  `;
  if (issue.length === 0) {
    throw new Error("Issue not found");
  }
  return issue[0];
};
var updateIssueDB = async (token, id, payload) => {
  const { title, description, type } = payload;
  if (!token) {
    throw new Error("Unauthorized");
  }
  const decode = decodeToken(token);
  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `;
  const issueData = await sql`
    SELECT * FROM issues WHERE id = ${id} 
    `;
  const user = userData[0];
  const issue = issueData[0];
  if (!user) {
    throw new Error("Unauthorized user");
  }
  if (!issue) {
    throw new Error("issue not fount");
  }
  if (user.role !== "maintainer" && (issue.reporter_id !== user.id || issue.status !== "open")) {
    throw new Error("You don't have update access");
  }
  const result = await sql`
  UPDATE issues
  SET 
  title = COALESCE(${title}, title),
  description = COALESCE(${description}, description),
  type = COALESCE(${type}, type),
  updated_at = NOW()
  WHERE id = ${id}
  RETURNING *
  `;
  return result[0];
};
var deleteIssueDB = async (token, id) => {
  if (!token) {
    throw new Error("Unauthorized");
  }
  const decode = decodeToken(token);
  const userData = await sql`
    SELECT * FROM users WHERE email = ${decode.email} 
    `;
  const issueData = await sql`
    SELECT * FROM issues WHERE id = ${id} 
    `;
  const issue = issueData[0];
  const user = userData[0];
  if (!user) {
    throw new Error("Unauthorized user");
  }
  if (!issue) {
    throw new Error("issue not found");
  }
  if (user.role !== "maintainer") {
    throw new Error("You don't have delete access");
  }
  const result = await sql`
      DELETE FROM issues
      WHERE id = ${id}
      RETURNING *;
      `;
  return result;
};
var issueService = {
  createIssueDB,
  getAllIssuesDB,
  getIssueDB,
  updateIssueDB,
  deleteIssueDB
};

// src/modules/issues/issue.controller.ts
var createIssue = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      sendResponse(res, { message: "Unauthorized", error: {} }, 401);
      return;
    }
    const issue = await issueService.createIssueDB(req.body, authorization);
    sendResponse(res, { message: "Issue created successfully", data: issue }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var getAllIssues = async (req, res) => {
  try {
    const query = req.query;
    const result = await issueService.getAllIssuesDB(query);
    sendResponse(res, { data: result }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var getIssue = async (req, res) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      sendResponse(res, { message: "Invalid ID", error: true }, 204);
      return;
    }
    const result = await issueService.getIssueDB(id);
    sendResponse(res, { data: result }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    console.log(error);
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var updateIssue = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { id } = req.params;
    const payload = req.body;
    const result = await issueService.updateIssueDB(token, id, payload);
    sendResponse(res, { message: "Issue updated successfully", data: result }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    console.log(error);
    sendResponse(res, { message: errorMessage, error }, 500);
  }
};
var deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization;
    const result = await issueService.deleteIssueDB(token, id);
    console.log(result);
    sendResponse(res, { message: "Issue deleted successfylly" }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    console.log(error);
    sendResponse(res, { message: errorMessage }, 500);
  }
};
var issueController = {
  createIssue,
  getAllIssues,
  getIssue,
  updateIssue,
  deleteIssue
};

// src/modules/issues/issue.route.ts
var router2 = Router2();
router2.post("/", issueController.createIssue);
router2.get("/", issueController.getAllIssues);
router2.get("/:id", issueController.getIssue);
router2.patch("/:id", issueController.updateIssue);
router2.delete("/:id", issueController.deleteIssue);
var issueRouter = router2;

// src/app.ts
var app = express();
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.send("server is running!");
});
app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).json({
    status: false,
    message: err.message || "Internal Server Error"
  });
});
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(envConfig_default.port, () => {
    console.log(`Example app listening on port ${envConfig_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map