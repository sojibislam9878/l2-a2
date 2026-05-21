import { Router } from 'express';
import { issueController } from './issue.controller';
const router = Router ()

router.post("/", issueController.createIssue)
router.get("/", issueController.getAllIssues)
router.get("/:id", issueController.getIssue)

export const issueRouter = router