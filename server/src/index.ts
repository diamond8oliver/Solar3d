import { config } from './config';
import { createApp } from './app';
import { MockGoogleSolarClient, RealGoogleSolarClient } from './clients/google-solar.client';
import { MockPvwattsClient, RealPvwattsClient } from './clients/pvwatts.client';
import { InMemoryProjectRepository } from './repositories/project.repository';
import { ProjectService } from './services/project.service';

const solarClient = config.useMockSolar
  ? new MockGoogleSolarClient()
  : new RealGoogleSolarClient(config.googleSolarApiKey);

const pvwattsClient = config.useMockPvwatts
  ? new MockPvwattsClient()
  : new RealPvwattsClient(config.nrelApiKey);

const repo = new InMemoryProjectRepository();
const service = new ProjectService(solarClient, pvwattsClient, repo);
const app = createApp(service);

app.listen(config.port, () => {
  console.log(`Solar3d server running on http://localhost:${config.port}`);
  console.log(`Google Solar: ${config.useMockSolar ? 'mock' : 'real'}`);
  console.log(`PVWatts:      ${config.useMockPvwatts ? 'mock' : 'real'}`);
});
