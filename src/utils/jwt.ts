import jwt from "jsonwebtoken"
import envConfig from "../config/envConfig"
export const signTokes = (payloads: any)=>{
 const token = jwt.sign(payloads, envConfig.access_token as string, {expiresIn:"7d"}  )

 return {token}
}