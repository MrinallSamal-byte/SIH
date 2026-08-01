import express from "express";
import "dotenv/config";
import { connect } from "./lib/db.js";
import { connectRedis } from "./lib/redis.js";
import sosRouter from "./routes/sos.route.js";
import authRouter from "./routes/auth.route.js";
import missingRouter from "./routes/missing.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin:["http://localhost:5173"],
    credentials: true
}));
app.use(cookieParser());



app.use("/api",authRouter);
app.use("/api/sos", sosRouter);
app.use("/api/missing", missingRouter);


async function startServer() {
    await connect();
    await connectRedis();
    app.listen(port,() => {
        console.log(`Server running on PORT ${port}`)
    });
};

startServer().catch((error) => {
    console.error(error);
    process.exit(1);
});
