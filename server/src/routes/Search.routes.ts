import { Router } from "express";
import { 
    vectorSearch,
    semanticGlobalSearch
} from "@/controllers";


const router = Router()

router.post("/vector", vectorSearch)
router.post("/semantic", semanticGlobalSearch)

export default router