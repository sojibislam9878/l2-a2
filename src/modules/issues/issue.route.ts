import { Router } from 'express';
import { issueController } from './issue.controller';
const router = Router ()

router.post("/", issueController.createIssue)

export const issueRouter = router