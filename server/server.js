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
// Allow local dev, the production frontend, and every Vercel preview
// deployment of the client (e.g. project-mgt-client-<hash>-<team>.vercel.app).
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://project-mgt-client.vercel.app',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : []),
];
const allowedOriginPatterns = [
  /^https:\/\/project-mgt-client(-[a-z0-9-]+)?\.vercel\.app$/,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, Inngest) with no Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOriginPatterns.some(re => re.test(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

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

// On Vercel the app is invoked as a serverless function, so export it
// instead of binding a port. Locally, start the HTTP server as usual.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

export default app;