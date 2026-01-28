import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import walletRoutes from './routes/wallet.js';
import voucherRoutes from './routes/vouchers.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import resellerRoutes from './routes/reseller.js';
import couponRoutes from './routes/coupons.js';
import analyticsRoutes from './routes/analytics.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import categoriesRoutes from './routes/categories.js';
import brandsRoutes from './routes/brands';
import inventoryRoutes from './routes/inventory.js';
import chatRoutes from './routes/chat.js';
import { analyticsMiddleware } from './middleware/analytics.js';

import { createServer } from 'http';
import { initSocket } from './services/socketService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3001;

// Initialize Socket.io
initSocket(httpServer);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://localhost:8080',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://aldarb.ly',
        'https://last-production-ed64.up.railway.app',
        'https://glamour-glow-website-main-production.up.railway.app'
    ],
    credentials: true
}));
app.use(express.json());
app.use(analyticsMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reseller', resellerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Glamour Glow API is running' });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📦 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🌐 Network: http://192.168.1.103:${PORT}`);
});
