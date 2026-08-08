import express from "express";
import multer from "multer";
import {
    submitDamageReport,
    getMyReports,
    getReportById,
    adminListReports,
    reviewReport,
} from "../controllers/damage.controller.js";
import { validate, SubmitDamageReportSchema, ReviewDamageReportSchema } from "../lib/validator.js";
import { AuthMiddleware, AdminMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Single photo upload — separate from the SOS audio/video multer config
const uploadPhoto = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/heic", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, HEIC, and WebP images are accepted"), false);
        }
    },
}).single("photo");

// ── Citizen routes ────────────────────────────────────────────────────────────

// Submit a new damage report (photo upload + form fields)
router.post(
    "/submit",
    AuthMiddleware,
    uploadPhoto,
    validate(SubmitDamageReportSchema),
    submitDamageReport
);

// View own reports
router.get("/my-reports", AuthMiddleware, getMyReports);

// View a single report (citizens see their own; admins see all — enforced in controller)
router.get("/:id", AuthMiddleware, getReportById);

// ── Admin routes ──────────────────────────────────────────────────────────────

// List all reports with optional filters (?status=&damageGrade=&isDuplicate=&page=&limit=)
router.get("/admin/list", AdminMiddleware, adminListReports);

// Approve / reject / flag a report
router.patch(
    "/admin/:id/review",
    AdminMiddleware,
    validate(ReviewDamageReportSchema),
    reviewReport
);

export default router;
