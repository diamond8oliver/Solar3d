import express from 'express';
import cors from 'cors';
import { createProjectsRouter } from './routes/projects';
import { ProjectService } from './services/project.service';

export function createApp(service: ProjectService): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', createProjectsRouter(service));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
