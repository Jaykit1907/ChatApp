import express from "express";
import { setLanguage } from "../controllers/languageController.js";

const router = express.Router();

// ✅ PATCH for update
router.patch("/set-language", setLanguage);

export default router;
