import { createClient } from "redis";
import "dotenv/config";
export const redisClient = createClient({
    url: process.env.REDIS_URL,
});

export const connectRedis = () => {
    redisClient.connect().then(() => {
        console.log('Connected to Redis Successfully');
    }).catch((e) => {
        console.log('redis error');
        console.error(e);
    })
}