import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  googleSolarApiKey: process.env.GOOGLE_SOLAR_API_KEY || '',
  nrelApiKey: process.env.NREL_API_KEY || '',
  useMockApis: process.env.USE_MOCK_APIS !== 'false',
};
