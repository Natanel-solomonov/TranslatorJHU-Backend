import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { RegisterDto, LoginDto } from "../dto/AuthDto";

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  "/register",
  validateRequest(RegisterDto),
  authController.register.bind(authController)
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  "/login",
  validateRequest(LoginDto),
  authController.login.bind(authController)
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post(
  "/logout",
  authMiddleware,
  authController.logout.bind(authController)
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get(
  "/me",
  authMiddleware,
  authController.getProfile.bind(authController)
);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  "/profile",
  authMiddleware,
  authController.updateProfile.bind(authController)
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post(
  "/refresh",
  authMiddleware,
  authController.refreshToken.bind(authController)
);

export { router as authRoutes };





