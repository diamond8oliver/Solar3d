import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/project.service';

type Params = Record<string, string>;

export function createProjectsRouter(service: ProjectService): Router {
  const router = Router();

  router.post('/projects', async (req: Request, res: Response) => {
    try {
      const { address, lat, lng, monthlyBillUsd } = req.body;
      if (!address || lat == null || lng == null) {
        res.status(400).json({ error: 'address, lat, and lng are required' });
        return;
      }
      const project = await service.createProject({
        address,
        lat: Number(lat),
        lng: Number(lng),
        monthlyBillUsd: Number(monthlyBillUsd) || 150,
      });
      res.status(201).json(project);
    } catch (err) {
      console.error('Error creating project:', err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  router.get('/projects', async (_req: Request, res: Response) => {
    const projects = await service.listProjects();
    res.json(projects);
  });

  router.get('/projects/:id', async (req: Request<Params>, res: Response) => {
    const project = await service.getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  });

  router.post('/projects/:id/share', async (req: Request<Params>, res: Response) => {
    const token = await service.generateShareToken(req.params.id);
    if (!token) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ shareToken: token, shareUrl: `/share/${token}` });
  });

  router.get('/share/:token', async (req: Request<Params>, res: Response) => {
    const project = await service.getProjectByShareToken(req.params.token);
    if (!project) {
      res.status(404).json({ error: 'Shared project not found' });
      return;
    }
    // Strip PII from shared view
    const { monthlyBillUsd: _, ...publicView } = project;
    res.json(publicView);
  });

  return router;
}
