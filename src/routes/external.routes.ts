import { Router, Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import * as apiAService from '../services/apiA.service';
import * as apiBService from '../services/apiB.service';
import { CircuitBreaker } from '../middleware/circuitBreaker';

const router = Router();
const circuitBreaker = new CircuitBreaker();

// GET /external/api-a/:id - Fetch data from API A (with retries)
router.get(
    '/api-a/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            throw new ApiError(400, 'Invalid ID');
        }

        // Use circuit breaker for external API call
        const data = await circuitBreaker.execute(() => {
            return apiAService.fetchProductData(id);
        });

        res.json({
            success: true,
            data,
        });
    })
);

// POST /external/webhook - Receive webhook from API B
router.post(
    '/webhook',
    asyncHandler(async (req: Request, res: Response) => {
        const event = {
            eventId: req.body.eventId || apiBService.generateEventId(),
            type: req.body.type,
            data: req.body.data,
            timestamp: Date.now(),
        };

        // Process webhook with idempotency check
        const processed = await apiBService.processWebhookEvent(event);

        res.json({
            success: true,
            processed,
            eventId: event.eventId,
        });
    })
);

// GET /external/circuit-status - Get circuit breaker status
router.get(
    '/circuit-status',
    asyncHandler(async (req: Request, res: Response) => {
        res.json({
            success: true,
            state: circuitBreaker.getState(),
        });
    })
);

export default router;
