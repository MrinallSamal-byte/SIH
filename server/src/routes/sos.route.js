import express from "express";
import { assignSos, createSos, getSosById, listSos, updateSosStatus } from "../controllers/sos.controller.js";
import { validate,  CreateSosSchema, UpdateSosSchema} from "../lib/validator.js"
import upload from "../lib/multer.js";
import { AdminMiddleware } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create",upload,validate(CreateSosSchema), createSos);
router.get("/list", AdminMiddleware,listSos);
router.get("/:id", AdminMiddleware,getSosById);
router.patch("/:id/status",AdminMiddleware, validate(UpdateSosSchema),updateSosStatus);
router.patch("/:id/assign",AdminMiddleware,validate(UpdateSosSchema), assignSos);

export default router;
