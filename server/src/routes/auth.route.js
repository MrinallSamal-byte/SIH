import express from "express";
import { validate, CreateUserSchema } from "../lib/validator.js";
import { register } from "../controllers/auth.controller.js"; 
const router = express.Router();
router.post("/register",validate(CreateUserSchema),register);
export default router;