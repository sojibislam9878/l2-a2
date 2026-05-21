import { Router } from 'express';
import { issueController } from './issue.controller';
const router = Router ()

router.post("/", issueController.createIssue)
router.get("/", issueController.getAllIssues)
router.get("/:id", issueController.getIssue)
router.patch("/:id", issueController.updateIssue)

export const issueRouter = router