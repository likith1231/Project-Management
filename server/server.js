import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';

const app = express();

// ✅ CORS must come first
app.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ Raw body parser for Inngest webhook verification
app.use('/api/inngest', express.raw({ type: 'application/json' }));

// ✅ JSON parser for all other routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/inngest')) return next();
  express.json()(req, res, next);
});

app.get('/', (req, res) => res.send('Server is live!'));

// ✅ Inngest route - no protect middleware here
app.use("/api/inngest", serve({ 
  client: inngest, 
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
}));

// ✅ Protected routes
app.use("/api/workspaces", protect, workspaceRouter);
app.use("/api/projects", protect, projectRouter);
app.use("/api/tasks", protect, taskRouter);
app.use("/api/comments", protect, commentRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));