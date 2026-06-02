import { Router } from 'express';
import { 
  createTaskTemplate, 
  getTaskTemplates, 
  updateTaskTemplate, 
  createTaskFromTemplate 
} from '../controllers/taskTemplateController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAnyRole } from '../middlewares/rbac.js';

const router = Router();

// 1. Require the user to be logged in with a valid JWT token
router.use(authMiddleware);

// 2. Require the user to have elevated privileges
// They must be a Superadmin or Admin globally, OR a Head or Supervisor in a department
router.use(requireAnyRole(
  ['Superadmin', 'Admin'], 
  ['Head', 'Supervisor']
));

router.post('/', createTaskTemplate);
router.get('/', getTaskTemplates);
router.put('/:id', updateTaskTemplate);
router.post('/:templateId/spawn', createTaskFromTemplate);

export default router;