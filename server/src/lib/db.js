import { PrismaClient } from "@prisma/client";
import { PrismaPg }  from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

if(!DATABASE_URL) throw new Error("Databse URL not present");


const pool = new pg.Pool({
    connectionString: DATABASE_URL
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({adapter});



export async function connect() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully via Prisma & PG Adapter!');
    } catch(error) {
        console.error('Database connection failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

