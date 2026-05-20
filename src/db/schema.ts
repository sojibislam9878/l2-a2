import { sql } from ".";


export const createSchema = async ()=>{
    await sql`
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        name VARCHAR (150) NOT NULL,
        email VARCHAR (200) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR NOT NULL DEFAULT 'contributor',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
     )
    
    `;
    await sql`
    CREATE TABLE IF NOT EXISTS issues(
        id SERIAL PRIMARY KEY,
        title VARCHAR (150) NOT NULL,
        description TEXT NOT NULL CHECK (LENGTH(description) >= 10),
        type VARCHAR (20) NOT NULL,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
     )
    
    `;
}