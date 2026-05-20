import jwt from "jsonwebtoken"
import envConfig from "../config/envConfig"
export const signTokes = (payloads: any)=>{
 const token = jwt.sign(payloads, envConfig.access_token as string, {expiresIn:"7d"}  )

 return {token}
}

export const decodeToken = (payload : string)=>{
    const decoded = jwt.verify(payload, envConfig.access_token as string);
    return decoded
}