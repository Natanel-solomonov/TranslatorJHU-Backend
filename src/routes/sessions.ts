import { Router } from "express";
import { SessionController } from "../controllers/SessionController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { CreateSessionDto, UpdateSessionDto } from "../dto/SessionDto";

const router = Router();
const sessionController = new SessionController();

/**
 * @route POST /api/sessions
 * @desc Create a new translation session
 * @access Private
 */
router.post(
  "/",
  authMiddleware,
  validateRequest(CreateSessionDto),
  sessionController.createSession.bind(sessionController)
);

/**
 * @route GET /api/sessions
 * @desc Get user's translation sessions
 * @access Private
 */
router.get(
  "/",
  authMiddleware,
  sessionController.getSessions.bind(sessionController)
);

/**
 * @route GET /api/sessions/:sessionId
 * @desc Get specific translation session
 * @access Private
 */
router.get(
  "/:sessionId",
  authMiddleware,
  sessionController.getSession.bind(sessionController)
);

/**
 * @route PUT /api/sessions/:sessionId
 * @desc Update translation session
 * @access Private
 */
router.put(
  "/:sessionId",
  authMiddleware,
  validateRequest(UpdateSessionDto),
  sessionController.updateSession.bind(sessionController)
);

/**
 * @route DELETE /api/sessions/:sessionId
 * @desc Delete translation session
 * @access Private
 */
router.delete(
  "/:sessionId",
  authMiddleware,
  sessionController.deleteSession.bind(sessionController)
);

/**
 * @route POST /api/sessions/:sessionId/start
 * @desc Start a translation session
 * @access Private
 */
router.post(
  "/:sessionId/start",
  authMiddleware,
  sessionController.startSession.bind(sessionController)
);

/**
 * @route POST /api/sessions/:sessionId/pause
 * @desc Pause a translation session
 * @access Private
 */
router.post(
  "/:sessionId/pause",
  authMiddleware,
  sessionController.pauseSession.bind(sessionController)
);

/**
 * @route POST /api/sessions/:sessionId/end
 * @desc End a translation session
 * @access Private
 */
router.post(
  "/:sessionId/end",
  authMiddleware,
  sessionController.endSession.bind(sessionController)
);

/**
 * @route GET /api/sessions/:sessionId/metrics
 * @desc Get session metrics and analytics
 * @access Private
 */
router.get(
  "/:sessionId/metrics",
  authMiddleware,
  sessionController.getSessionMetrics.bind(sessionController)
);

export { router as sessionRoutes };
