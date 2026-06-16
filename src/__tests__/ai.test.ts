/**
 * AI plant-identify API tests — auth, validation, success (mocked provider),
 * and graceful provider failure. The OpenAI service is mocked so no real API
 * call is made.
 */

import request from 'supertest';

import { createApp } from '../app';
import { AppError } from '../utils/AppError';
import type { PlantIdentification } from '../types/ai.types';

jest.mock('../services/aiPlant.service', () => ({ identifyPlant: jest.fn() }));
import { identifyPlant } from '../services/aiPlant.service';
const mockIdentify = identifyPlant as jest.MockedFunction<typeof identifyPlant>;

const app = createApp();

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const fakeResult: PlantIdentification = {
  isPlant: true,
  commonName: 'Basil',
  scientificName: 'Ocimum basilicum',
  confidence: 0.82,
  plantType: 'herb',
  possibleMatches: [{ commonName: 'Basil', scientificName: 'Ocimum basilicum', confidence: 0.82 }],
  careSummary: { sunPreference: 'full_sun', wateringPreference: 'moderate', difficulty: 'easy', notes: 'Loves sun.' },
  disclaimer: 'AI plant identification can be imperfect. Please confirm before adding.',
};

let counter = 0;
async function getToken(): Promise<string> {
  counter += 1;
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Scanner', email: `scan${Date.now()}-${counter}@example.com`, password: 'Password123!' });
  return res.body.token as string;
}

beforeEach(() => mockIdentify.mockReset());

describe('POST /api/ai/plant-identify', () => {
  it('rejects unauthenticated requests (401)', async () => {
    const res = await request(app)
      .post('/api/ai/plant-identify')
      .attach('image', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('rejects a missing image (400)', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/ai/plant-identify').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type (400)', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/ai/plant-identify')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('hello world'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('rejects an oversized image (400)', async () => {
    const token = await getToken();
    const big = Buffer.alloc(9 * 1024 * 1024, 1); // 9MB > 8MB limit
    const res = await request(app)
      .post('/api/ai/plant-identify')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('returns a structured identification on success (200)', async () => {
    mockIdentify.mockResolvedValue(fakeResult);
    const token = await getToken();
    const res = await request(app)
      .post('/api/ai/plant-identify')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.identification.commonName).toBe('Basil');
    expect(res.body.identification.plantType).toBe('herb');
    expect(res.body.identification.possibleMatches).toHaveLength(1);
    expect(mockIdentify).toHaveBeenCalledTimes(1);
  });

  it('handles AI provider failure gracefully (502, no provider details leaked)', async () => {
    mockIdentify.mockRejectedValue(new AppError(502, 'Sprout’s plant expert is taking a quick break.'));
    const token = await getToken();
    const res = await request(app)
      .post('/api/ai/plant-identify')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(502);
    expect(typeof res.body.message).toBe('string');
  });
});
