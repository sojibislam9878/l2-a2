import app from "./app"
import envConfig from "./config/envConfig"
import { initDB } from "./db"

const main =()=>{
    initDB()
  app.listen(envConfig.port, () => {
  console.log(`Example app listening on port ${envConfig.port}`)
})
}

main()