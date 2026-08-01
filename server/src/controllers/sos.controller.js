import TryCatch from "../lib/TryCatch.js";
import bcrypt from "bcrypt";
import { redisClient } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import { prisma } from "../lib/db.js";
export const createSos = TryCatch(
    async (req, res) => {


        const clientIp = req.ip;
        const hashedIP = await bcrypt.hash(clientIp, 10);
        const key = `${hashedIP}:${req.user.userId}`;
        const count = await redisClient.exists(key);
        if (count === 1) {
            return res.status(409).json("SOS can be submitted once every 10min");
        }
        await redisClient.setEx(key, 600, "sos");

        const {
            peopleCount,
            hasChildren,
            hasElderly,
            hasDisabled,
            medicalNeed,
            lastKnownGPS,
            desc
        } = req.body;

        if (!req.files || !req.files['audio'] || !req.files['video']) {
            return res.status(400).json({ error: 'Both audio and video files are required.' });
        }
        let audioUrl = "";
        let videoUrl = "";
        if (req.files['audio']) {
            const audioResult = await cloudinary.uploader.upload(req.files['audio'], { resource_type: "auto" });
            audioUrl = audioResult.secure_url;
        }

        if (req.files['video']) {
            const videoResult = await cloudinary.uploader.upload(req.files['video'], { resource_type: "video" });
            videoUrl = videoResult.secure_url;
        }

        //todo: to send request to the FastAPI route with video and audio url so that ML model could define and return its priority Score and desc
        const fastApiUrl = "http://localhost:8000/api/analyze-sos";

        const mlResponse = await fetch(fastApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                audioUrl,
                videoUrl,
                desc: desc || ""
            }),
        });

        if (!mlResponse.ok) {
            throw new Error("Failed to analyze media via ML model");
        }

        const mlData = await mlResponse.json();

        const priorityScore = mlData.priorityScore || 0;
        const urgency = mlData.urgency || "MEDIUM";
        const helpType = mlData.helpType || "OTHER";
        const enhancedDesc = mlData.desc || desc;


        const newSos = await prisma.sos.create({
            data: {
                reporterId: req.user.userId,
                lastKnownGPS: lastKnownGPS ? JSON.parse(lastKnownGPS) : [], // Ensure this is parsed if sent as string
                peopleCount: parseInt(peopleCount) || 1,
                hasChildren: hasChildren === 'true' || hasChildren === true,
                hasElderly: hasElderly === 'true' || hasElderly === true,
                hasDisabled: hasDisabled === 'true' || hasDisabled === true,
                medicalNeed: medicalNeed === 'true' || medicalNeed === true,
                desc: enhancedDesc,
                audioUrl,
                videoUrl,
                helpType,
                urgency,
                priorityScore,
                status: "PENDING"
            }
        });
        res.status(201).json({
            message: "SOS created successfully",
            data: newSos
        });
    }
)

// admin ke liye
export const listSos = TryCatch(async (req, res) => {
    const soslist = await prisma.sos.findMany({
        orderBy: {
            priorityScore: 'desc'
        },
        include: {
            reporter: {
                select: { name: true, phoneNumber: true }
            },
            assignedTo: {
                select: { name: true, phoneNumber: true }
            }
        }
    });

    res.status(200).json({
        count: soslist.length,
        data: soslist
    });
});


export const getSosById = TryCatch(async (req, res) => {
    const { id: sosId } = req.params;
    const sos = await prisma.sos.findUnique({
        where: {id: sosId},
        include: {
            reporter:{select: {name: true,phoneNumber: true,role:true}},
            assignedTo: {select: {name: true, phoneNumber: true,role: true}}
        }
    });
    if(!sos) {
        return res.status(404).json({ error: "SOS request not found" });
    }
    res.status(200).json({
        sosData: sos
    })
});


export const updateSosStatus = TryCatch(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // expected to be one of the STATUS enum values

    const updatedSos = await prisma.sos.update({
        where: { id },
        data: { status }
    });

    res.status(200).json({
        message: "SOS status updated",
        data: updatedSos
    });
});

export const assignSos = TryCatch(async (req, res) => {
    const { id } = req.params;
    const { assignedToId } = req.body; // the ID of the volunteer/admin taking the case

    const assignedSos = await prisma.sos.update({
        where: { id },
        data: { 
            assignedToId,
            status: "ASSIGNED" 
        },
        include: {
            assignedTo: { select: { name: true, phoneNumber: true } }
        }
    });

    res.status(200).json({
        message: "SOS assigned successfully",
        data: assignedSos
    });
});

