import type { AddressRecord, Project } from '@solar3d/shared';

export class ProjectsApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function createProject(
  address: AddressRecord,
  monthlyBillUsd: number,
  signal?: AbortSignal,
): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: address.fullAddress,
      lat: address.location.lat,
      lng: address.location.lng,
      monthlyBillUsd,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProjectsApiError(
      `createProject failed (${res.status}): ${text || res.statusText}`,
      res.status,
    );
  }
  return res.json() as Promise<Project>;
}
