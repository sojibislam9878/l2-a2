import { neon } from "@neondatabase/serverless";
import { createSchema } from "./schema";
import envConfig from "../config/envConfig";

export const sql = neon(envConfig.db_url as string);

export const initDB = async ()=>{
    await createSchema();
    console.log("Database connected successfully!")
}
