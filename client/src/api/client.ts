import type { Project, CreateProjectInput } from '@solar3d/shared';

const BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return request(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function getProject(id: string): Promise<Project> {
  return request(`${BASE}/projects/${id}`);
}

export function listProjects(): Promise<Project[]> {
  return request(`${BASE}/projects`);
}

export function generateShareLink(
  id: string
): Promise<{ shareToken: string; shareUrl: string }> {
  return request(`${BASE}/projects/${id}/share`, { method: 'POST' });
}

export function getSharedProject(token: string): Promise<Project> {
  return request(`${BASE}/share/${token}`);
}
