import { Router } from "express";
import { 
    vectorSearch 
} from "@/controllers";


const router = Router()

router.post("/", vectorSearch)

export default router