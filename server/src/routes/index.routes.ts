import { Router } from "express";
import chat from "./chat.routes"
import vector from "./vectorSearch.routes"

const router = Router()

router.use("/chat", chat)
router.use("/vector", vector)

export default router