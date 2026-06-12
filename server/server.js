import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';

const app = express();

app.use(express.json());

// ✅ CORS must explicitly allow Authorization header
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both ports
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ clerkMiddleware AFTER cors
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is live!'));

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/workspaces", protect, workspaceRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));