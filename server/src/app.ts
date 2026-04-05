import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sessionMiddleware } from './config/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { env } from './config/env.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import inboxRoutes from './routes/inbox.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';

/**
 * Express app factory.
 * Separating app creation from server.listen() makes the app testable
 * (you can import the app in tests without starting the server).
 */
export function createApp() {
  const app = express();

  // ---- Security Middleware ----
  app.use(helmet({
    // Disable CSP in dev since Vite injects inline scripts
    contentSecurityPolicy: env.isProd ? undefined : false,
  }));

  app.use(cors({
    origin: env.frontendUrl,
    credentials: true,  // Required for cookies to be sent cross-origin
  }));

  // ---- Body Parsing ----
  app.use(express.json({ limit: '1mb' }));

  // ---- Session ----
  app.use(sessionMiddleware);

  // ---- Rate Limiting ----
  app.use('/api', generalLimiter);

  // ---- Routes ----
  app.use('/auth', authRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/analyze', analysisRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/integrations', integrationsRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ---- Error Handler (must be last) ----
  app.use(errorHandler);

  return app;
}
