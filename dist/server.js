
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
        description TEXT NOT NULL CHECK (char_length(description) >= 20),
        type VARCHAR (20) NOT NULL,
        status VARCHAR (20) NOT NULL DEFAULT 'open',
        reporter_id INTEGER NOT NULL,
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

// src/utils/AppError.ts
var AppError = class extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
};

// src/modules/auth/auth.service.ts
var signupDB = async (payload) => {
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
    const user = result[0];
    const { password, ...userWithoutPass } = user;
    return userWithoutPass;
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      throw new AppError(400, "Email already exists");
    }
    throw err;
  }
};
var loginDB = async (payload) => {
  const { email: reqEmail, password } = payload;
  if (!reqEmail || !password) {
    throw new AppError(400, "Email and password are required");
  }
  const userData = await sql`
    SELECT * FROM users
    WHERE email = ${reqEmail};
  `;
  const user = userData[0];
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const hashPass = user.password;
  const isValidPassword = await bcrypt.compare(password, hashPass);
  if (!isValidPassword) {
    throw new AppError(401, "Invalid credentials");
  }
  if (!user.id) {
    throw new AppError(500, "user id missing");
  }
  const { password: userPass, ...userWithoutPassword } = user;
  const { token } = signTokes({ id: user.id, name: user.name, role: user.role });
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
var signup = async (req, res, next) => {
  try {
    const result = await authService.signupDB(req.body);
    sendResponse(res, { message: "User registered successfully", data: result }, 201);
  } catch (error) {
    next(error);
  }
};
var login = async (req, res, next) => {
  try {
    const result = await authService.loginDB(req.body);
    sendResponse(res, { message: "Login successfully", data: result }, 200);
  } catch (error) {
    next(error);
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
  const { title, description, type, status = "open" } = payload;
  if (!title || !description || !type) {
    throw new AppError(400, "Title, description and type are required");
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
    throw new AppError(400, "Description is too short (minimum 20 characters)");
  }
  if (description.length < 20) {
    throw new AppError(400, "Description is too short (minimum 20 characters)");
  }
  if (type !== "bug" && type !== "feature_request") {
    throw new AppError(400, "Type must be either 'bug' or 'feature_request'");
  }
  if (status) {
    if (status !== "open" && status !== "in_progress" && status !== "resolved") {
      throw new AppError(400, "Status must be 'open' , 'in_progress' or 'resolved'");
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
    throw new AppError(404, "Issue not found");
  }
  return issue[0];
};
var updateIssueDB = async (token, id, payload) => {
  const { title, description, type } = payload;
  if (!token) {
    throw new AppError(401, "Unauthorized");
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
    throw new AppError(401, "Unauthorized");
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
    throw new AppError(401, "Unauthorized user");
  }
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }
  if (user.role !== "maintainer") {
    throw new AppError(403, "You don't have delete access");
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
var createIssue = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new AppError(401, "Unauthorized");
    }
    const issue = await issueService.createIssueDB(req.body, authorization);
    sendResponse(res, { message: "Issue created successfully", data: issue }, 201);
  } catch (error) {
    next(error);
  }
};
var getAllIssues = async (req, res, next) => {
  try {
    const query = req.query;
    const result = await issueService.getAllIssuesDB(query);
    sendResponse(res, { message: "Issues retrived successfully", data: result }, 200);
  } catch (error) {
    next(error);
  }
};
var getIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new AppError(400, "Invalid ID");
    }
    const result = await issueService.getIssueDB(id);
    sendResponse(res, { message: "Issues retrived successfully", data: result }, 200);
  } catch (error) {
    next(error);
  }
};
var updateIssue = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const { id } = req.params;
    const payload = req.body;
    const result = await issueService.updateIssueDB(token, id, payload);
    sendResponse(res, { message: "Issue updated successfully", data: result }, 200);
  } catch (error) {
    next(error);
  }
};
var deleteIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization;
    const result = await issueService.deleteIssueDB(token, id);
    console.log(result);
    sendResponse(res, { message: "Issue deleted successfully" }, 200);
  } catch (error) {
    next(error);
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
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
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