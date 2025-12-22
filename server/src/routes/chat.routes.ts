import { Router } from "express";
import { 
    handleChat,
    handleSemanticChat
} from "@/controllers";


const router = Router()

router.post("/vector", handleChat)
router.post("/semantic", handleSemanticChat)

export default router