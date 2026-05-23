import express, { type Application, type NextFunction, type Request, type Response } from "express"
import { authRouter } from "./modules/auth/auth.route"
import { issueRouter } from "./modules/issues/issue.route"
import { AppError } from "./utils/AppError"
const app:Application = express()

app.use(express.json())
app.use(express.text())
app.use(express.urlencoded({extended:true}))

app.get('/', (req:Request, res:Response) => {
  res.send('server is running!')
})

app.use("/api/auth", authRouter)
app.use("/api/issues", issueRouter)

app.use((err:Error, req:Request, res:Response, next:NextFunction)=>{
  console.log(err.stack);
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error"
  })
})

export default app