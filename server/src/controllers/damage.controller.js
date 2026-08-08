import TryCatch from "../lib/TryCatch.js";
import cloudinary from "../lib/cloudinary.js";
import { prisma } from "../lib/db.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
async function uploadToCloudinary(buffer, mimetype) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image", folder: "damage_reports" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

/**
 * Fetch all pHashes for existing DamageReports in the same area so the AI
 * service can run duplicate detection.
 *
 * We query a ±0.05° bounding box (~5 km) around the claimed location.
 */
async function getExistingHashes(lat, lng) {
    const DELTA = 0.05;
    const reports = await prisma.damageReport.findMany({
        where: {
            claimedGpsLat: { gte: lat - DELTA, lte: lat + DELTA },
            claimedGpsLng: { gte: lng - DELTA, lte: lng + DELTA },
            pHash: { not: null },
        },
        select: { id: true, pHash: true },
    });
    return reports; // [{ id, pHash }]
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/damage/submit
 *
 * Citizen submits a damage photo for assessment.
 * Flow:
 *   1. Upload photo → Cloudinary
 *   2. Forward to Python AI service (EXIF + pHash + ResNet50)
 *   3. Store result in DamageReport table
 *   4. Return assessment to the client
 */
export const submitDamageReport = TryCatch(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "A damage photo is required." });
    }

    const {
        claimedGpsLat,
        claimedGpsLng,
        propertyType = "RESIDENTIAL",
        disasterCutoff,   // ISO-8601 e.g. "2025-07-30T00:00:00"
        ownershipProof,   // optional document URL
    } = req.body;

    // ── 1. Upload photo to Cloudinary ────────────────────────────────────────
    const photoUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    // ── 2. Fetch existing hashes for duplicate detection ─────────────────────
    const existingRecords = await getExistingHashes(
        parseFloat(claimedGpsLat),
        parseFloat(claimedGpsLng)
    );
    const existingHashesCsv = existingRecords
        .map((r) => r.pHash)
        .filter(Boolean)
        .join(",");

    // ── 3. Call the Python AI service ─────────────────────────────────────────
    const formData = new FormData();
    formData.append("photo_url",          photoUrl);
    formData.append("claimed_lat",        claimedGpsLat.toString());
    formData.append("claimed_lng",        claimedGpsLng.toString());
    formData.append("property_type",      propertyType);
    formData.append("disaster_cutoff",    disasterCutoff);
    formData.append("existing_hashes_csv", existingHashesCsv);

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/assess-damage`, {
        method: "POST",
        body: formData,
    });

    if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        return res.status(502).json({
            success: false,
            message: "AI service error",
            detail: errText,
        });
    }

    const ai = await aiResponse.json();

    // ── 4. Resolve duplicate reference ID ────────────────────────────────────
    let duplicateOfId = null;
    if (ai.is_duplicate && ai.duplicate_of_hash) {
        const original = existingRecords.find((r) => r.pHash === ai.duplicate_of_hash);
        if (original) duplicateOfId = original.id;
    }

    // ── 5. Persist to DB ──────────────────────────────────────────────────────
    const report = await prisma.damageReport.create({
        data: {
            reporterId:         req.user.id,
            photoUrl,
            // EXIF
            exifGpsLat:         ai.exif_gps_lat,
            exifGpsLng:         ai.exif_gps_lng,
            exifTimestamp:      ai.exif_timestamp ? new Date(ai.exif_timestamp) : null,
            exifMake:           ai.camera_make,
            exifModel:          ai.camera_model,
            gpsVerified:        ai.gps_verified,
            timestampVerified:  ai.timestamp_verified,
            // pHash
            pHash:              ai.phash,
            isDuplicate:        ai.is_duplicate,
            duplicateOfId,
            // AI result
            damageGrade:        ai.damage_grade,
            confidenceScore:    ai.confidence_score,
            aiDescription:      ai.ai_description,
            // Compensation
            compensationAmount: ai.compensation_amount,
            propertyType:       ai.property_type,
            ownershipProof:     ownershipProof || null,
            // Claimed location
            claimedGpsLat:      parseFloat(claimedGpsLat),
            claimedGpsLng:      parseFloat(claimedGpsLng),
            // If fraud flags exist, auto-flag for review; else pending
            reviewStatus:       ai.fraud_flags?.length > 0 ? "PENDING_REVIEW" : "PENDING_REVIEW",
        },
    });

    return res.status(201).json({
        success: true,
        message: "Damage report submitted successfully",
        data: {
            reportId:           report.id,
            damageGrade:        report.damageGrade,
            confidenceScore:    report.confidenceScore,
            compensationAmount: report.compensationAmount,
            gpsVerified:        report.gpsVerified,
            timestampVerified:  report.timestampVerified,
            isDuplicate:        report.isDuplicate,
            reviewStatus:       report.reviewStatus,
            fraudFlags:         ai.fraud_flags,
            aiDescription:      report.aiDescription,
        },
    });
});

/**
 * GET /api/damage/my-reports
 *
 * Citizen views their own submitted reports.
 */
export const getMyReports = TryCatch(async (req, res) => {
    const reports = await prisma.damageReport.findMany({
        where: { reporterId: req.user.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            photoUrl: true,
            damageGrade: true,
            confidenceScore: true,
            compensationAmount: true,
            gpsVerified: true,
            timestampVerified: true,
            isDuplicate: true,
            reviewStatus: true,
            reviewNote: true,
            propertyType: true,
            claimedGpsLat: true,
            claimedGpsLng: true,
            createdAt: true,
        },
    });

    return res.status(200).json({ success: true, count: reports.length, data: reports });
});

/**
 * GET /api/damage/:id
 *
 * Get a single report by ID. Citizens can only see their own; admins see all.
 */
export const getReportById = TryCatch(async (req, res) => {
    const { id } = req.params;

    const report = await prisma.damageReport.findUnique({
        where: { id },
        include: {
            reporter:   { select: { id: true, name: true, phoneNumber: true } },
            reviewedBy: { select: { id: true, name: true } },
        },
    });

    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    // Citizens can only access their own reports
    if (req.user.role === "CITIZEN" && report.reporterId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({ success: true, data: report });
});

/**
 * GET /api/damage/admin/list
 *
 * Admin: list all reports with filters.
 * Query params: status, damageGrade, isDuplicate, page, limit
 */
export const adminListReports = TryCatch(async (req, res) => {
    const {
        status,
        damageGrade,
        isDuplicate,
        page  = "1",
        limit = "20",
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

    const where = {};
    if (status)      where.reviewStatus = status;
    if (damageGrade) where.damageGrade  = damageGrade;
    if (isDuplicate !== undefined) where.isDuplicate = isDuplicate === "true";

    const [total, reports] = await Promise.all([
        prisma.damageReport.count({ where }),
        prisma.damageReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip:  (pageNum - 1) * pageSize,
            take:  pageSize,
            include: {
                reporter:   { select: { name: true, phoneNumber: true } },
                reviewedBy: { select: { name: true } },
            },
        }),
    ]);

    return res.status(200).json({
        success: true,
        total,
        page: pageNum,
        pages: Math.ceil(total / pageSize),
        data: reports,
    });
});

/**
 * PATCH /api/damage/admin/:id/review
 *
 * Admin approves, rejects, or flags a report for re-survey.
 * Body: { reviewStatus, reviewNote, compensationAmount? }
 */
export const reviewReport = TryCatch(async (req, res) => {
    const { id } = req.params;
    const { reviewStatus, reviewNote, compensationAmount } = req.body;

    const existing = await prisma.damageReport.findUnique({ where: { id } });
    if (!existing) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    const updateData = {
        reviewStatus,
        reviewNote:  reviewNote  || null,
        reviewedById: req.user.id,
        reviewedAt:  new Date(),
    };

    // Admin can override the AI-calculated compensation
    if (compensationAmount !== undefined) {
        updateData.compensationAmount = parseFloat(compensationAmount);
    }

    const updated = await prisma.damageReport.update({
        where: { id },
        data:  updateData,
        include: {
            reporter: { select: { name: true, phoneNumber: true } },
        },
    });

    return res.status(200).json({
        success: true,
        message: `Report ${reviewStatus.toLowerCase()} successfully`,
        data: updated,
    });
});
