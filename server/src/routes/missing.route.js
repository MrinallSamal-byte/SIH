import express from "express";
import {
  confirmMissingMatch,
  createMissingReport,
  createShelterResident,
  getMissingReportById,
  listMissingReports,
  searchShelterResidents,
} from "../controllers/missing.controller.js";
import { validate, ConfirmMissingMatchSchema, CreateMissingPersonSchema, CreateShelterResidentSchema } from "../lib/validator.js";
import { AdminMiddleware, AuthMiddleware, VolunteerMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", AuthMiddleware, validate(CreateMissingPersonSchema), createMissingReport);
router.get("/", AdminMiddleware, listMissingReports);
router.get("/search", AdminMiddleware, searchShelterResidents);
router.get("/:id", AdminMiddleware, getMissingReportById);
router.post("/shelter-residents", VolunteerMiddleware, validate(CreateShelterResidentSchema), createShelterResident);
router.patch("/:id/confirm", VolunteerMiddleware, validate(ConfirmMissingMatchSchema), confirmMissingMatch);

export default router;
