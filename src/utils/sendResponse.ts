import type { Response } from "express";

export const sendResponse =<T>(res:Response, {message, data, error}:{message?: string, data?: T, error?:T},status = 200 )=>{
    res.status(status).json({
        success: !error,
        message:message,
        data: error ? undefined : data,
        error: error && error
    })
}