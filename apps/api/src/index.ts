import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Route Handlers
import authRouter from './routes/auth';
import servicesRouter from './routes/services';
import applicationsRouter from './routes/applications';
import documentsRouter from './routes/documents';
import paymentsRouter from './routes/payments';
import analyticsRouter from './routes/analytics';
import settingsRouter from './routes/settings';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable secure HTTP headers
app.use(helmet());

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:3000'
].filter(Boolean) as string[];

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// HTTP request logging
app.use(morgan('dev'));

// JSON body parsing
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE REGISTRATION (BASE URL: /api/v1)
// ─────────────────────────────────────────────────────────────────────────────

// 1. Authentication (Citizen OTP + Staff login)
app.use('/api/v1/auth', authRouter);

// 2. Services (Public list & details)
app.use('/api/v1/services', servicesRouter);

// 3. Applications (Citizen submission & tracking, plus Admin list & details)
app.use('/api/v1/applications', applicationsRouter);
app.use('/api/v1/admin/applications', applicationsRouter);

// 4. Documents (Multer storage upload) & QR Verification
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1', documentsRouter); // Mounts /verify/:qr_token at /api/v1/verify/:qr_token

// 5. Payments (Treasurer Counter CASH logs)
app.use('/api/v1/admin/payments', paymentsRouter);

// 6. Analytics (Mayor KPIs & trends)
app.use('/api/v1/admin/analytics', analyticsRouter);

// 7. Settings (LGU profile, service configs, staff invites)
app.use('/api/v1/admin', settingsRouter);

// Root Welcome Endpoint
app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to BayanServe LGU Civic Services REST API',
    version: '1.0.0',
  });
});

// Health check endpoint
app.get('/api/v1/health', async (_req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL DATABASE CONFLICTS & CONNECTION ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]:', err);

  const errorName = err.name || '';
  const errorMessage = err.message || '';

  // Intercept database connectivity or prisma initialization errors
  if (
    errorName.includes('Prisma') ||
    errorMessage.includes('Prisma') ||
    errorMessage.includes('Can\'t reach database') ||
    errorMessage.includes('database connection')
  ) {
    return res.status(500).json({
      success: false,
      error: 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.',
    });
  }

  // Handle Multer upload limits/errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'Masyadong malaki ang file. Ang limitasyon ay 5MB lamang.',
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'May hindi inaasahang problema sa server.',
  });
});

// Start Express Listener
app.listen(port, () => {
  console.log(`[server]: BayanServe REST API listening on port ${port}`);
});
