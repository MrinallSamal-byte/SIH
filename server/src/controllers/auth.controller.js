import TryCatch  from "../lib/TryCatch.js";
import { prisma } from "../lib/db.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
export const register = TryCatch(async(req, res) => {
    const {  
        name,
        age,
        phoneNumber,
        role,
        skills,
        lastKnownGPS
    } = req.body;
    const existing = await prisma.user.findUnique({
        where: {
            phoneNumber
        }
    });

    if(existing) {
        return res.status(409).json({
            msg:"User Already existed"
        })
    };

    const newUser = await prisma.user.create({
        data:{
            name,
            age,
            gender,
            phoneNumber,
            role,
            skills
        }
    });

    const accessToken = jwt.sign({userId: newUser.id},process.env.JWT_SECRET,{
        expiresIn: "5m"
    });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV==="production",
        sameSite:'Lax',
        maxAge: 3 * 60 * 1000
    };

    res.cookie('token',accessToken,cookieOptions);

    res.status(200).json({
        msg:"User created successfully"
    })
});