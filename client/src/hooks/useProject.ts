import { useState, useEffect, useCallback } from 'react';
import type { Project, CreateProjectInput } from '@solar3d/shared';
import { createProject, getProject, getSharedProject } from '../api/client';

export function useProject(id?: string, shareToken?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getProject(id)
        .then(setProject)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (shareToken) {
      setLoading(true);
      getSharedProject(shareToken)
        .then(setProject)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, shareToken]);

  const create = useCallback(async (input: CreateProjectInput) => {
    setLoading(true);
    setError(null);
    try {
      const p = await createProject(input);
      setProject(p);
      return p;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { project, loading, error, create };
}
