import dotenv from "dotenv"
import Path from "path"
dotenv.config({path:Path.join(process.cwd(),".env")})

const envConfig ={
    port: process.env.PORT,
    db_url: process.env.DB_URL

}

export default envConfig