import { Router } from "express";
import chat from "./chat.routes"
import search from "./Search.routes"

const router = Router()

router.use("/chat", chat)
router.use("/search", search)

export default router