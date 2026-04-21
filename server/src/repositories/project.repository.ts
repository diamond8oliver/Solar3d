import { Project } from '@solar3d/shared';

export interface ProjectRepository {
  save(project: Project): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findAll(): Promise<Project[]>;
  findByShareToken(token: string): Promise<Project | null>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, Project>();
  private shareIndex = new Map<string, string>();

  async save(project: Project): Promise<Project> {
    this.store.set(project.id, project);
    if (project.shareToken) {
      this.shareIndex.set(project.shareToken, project.id);
    }
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.store.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByShareToken(token: string): Promise<Project | null> {
    const id = this.shareIndex.get(token);
    if (!id) return null;
    return this.store.get(id) ?? null;
  }
}
