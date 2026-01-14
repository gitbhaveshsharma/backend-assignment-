import { Router } from 'express';
import productRoutes from './product.routes';
import authRoutes from './auth.routes';
import externalRoutes from './external.routes';

const router = Router();

// Mount route modules
router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/external', externalRoutes);

export default router;
