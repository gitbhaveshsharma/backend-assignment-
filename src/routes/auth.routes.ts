import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as oauthService from '../services/oauth.service';

const router = Router();

// GET /auth/token - Get current OAuth token
router.get(
    '/token',
    asyncHandler(async (req: Request, res: Response) => {
        const token = await oauthService.getAccessToken();

        res.json({
            success: true,
            data: {
                token,
                type: 'Bearer',
            },
        });
    })
);

// POST /auth/refresh - Force refresh token
router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const token = await oauthService.refreshToken();

        res.json({
            success: true,
            data: {
                token,
                type: 'Bearer',
                message: 'Token refreshed successfully',
            },
        });
    })
);

// GET /auth/status - Check token status
router.get(
    '/status',
    asyncHandler(async (req: Request, res: Response) => {
        const isValid = await oauthService.isTokenValid();

        res.json({
            success: true,
            data: {
                hasValidToken: isValid,
            },
        });
    })
);

export default router;
