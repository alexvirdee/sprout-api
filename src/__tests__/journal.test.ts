/**
 * Journal feature tests — entry CRUD, ownership scoping, filters, photo
 * upload/serve (GridFS), and harvest logs flowing into profile stats +
 * achievements.
 */

import request from 'supertest';

import { createApp } from '../app';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
let n = 0;

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function setup() {
  n += 1;
  const s = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Journaler', email: `journal${Date.now()}-${n}@example.com`, password: 'Password123!' });
  const token = s.body.token as string;
  const g = await request(app).post('/api/gardens').set(auth(token)).send({ name: 'Journal Garden' });
  const gardenId = g.body.garden.id as string;
  const p = await request(app).post('/api/plants').set(auth(token)).send({ gardenId, name: 'Tomato', type: 'vegetable' });
  const plantId = p.body.plant.id as string;
  return { token, gardenId, plantId };
}

describe('journal API', () => {
  it('rejects unauthenticated requests (401)', async () => {
    expect((await request(app).get('/api/journal')).status).toBe(401);
  });

  it('creates a note entry and lists it', async () => {
    const { token, gardenId } = await setup();
    const create = await request(app)
      .post('/api/journal')
      .set(auth(token))
      .send({ gardenId, type: 'note', note: 'First sprouts poking through!' });
    expect(create.status).toBe(201);
    expect(create.body.entry.type).toBe('note');
    expect(create.body.entry.photoUrl).toBeNull();

    const list = await request(app).get('/api/journal').set(auth(token));
    expect(list.body.entries.length).toBe(1);
  });

  it('creates a harvest with quantity/unit/rating', async () => {
    const { token, gardenId, plantId } = await setup();
    const res = await request(app)
      .post('/api/journal')
      .set(auth(token))
      .send({ gardenId, plantId, type: 'harvest', quantity: 6, unit: 'count', rating: 5, note: 'Sweet!' });
    expect(res.status).toBe(201);
    expect(res.body.entry.quantity).toBe(6);
    expect(res.body.entry.unit).toBe('count');
    expect(res.body.entry.rating).toBe(5);
  });

  it('rejects an invalid unit (400)', async () => {
    const { token, gardenId } = await setup();
    const res = await request(app)
      .post('/api/journal')
      .set(auth(token))
      .send({ gardenId, type: 'harvest', quantity: 2, unit: 'truckloads' });
    expect(res.status).toBe(400);
  });

  it('rejects an entry for a garden you do not own (404)', async () => {
    const a = await setup();
    const b = await setup();
    const res = await request(app)
      .post('/api/journal')
      .set(auth(b.token))
      .send({ gardenId: a.gardenId, type: 'note', note: 'nope' });
    expect(res.status).toBe(404);
  });

  it('filters by type and plantId', async () => {
    const { token, gardenId, plantId } = await setup();
    await request(app).post('/api/journal').set(auth(token)).send({ gardenId, type: 'note', note: 'a' });
    await request(app).post('/api/journal').set(auth(token)).send({ gardenId, plantId, type: 'harvest', quantity: 1, unit: 'count' });

    const harvests = await request(app).get('/api/journal?type=harvest').set(auth(token));
    expect(harvests.body.entries.length).toBe(1);
    expect(harvests.body.entries[0].type).toBe('harvest');

    const byPlant = await request(app).get(`/api/journal?plantId=${plantId}`).set(auth(token));
    expect(byPlant.body.entries.length).toBe(1);
  });

  it('updates and deletes an entry, enforcing ownership', async () => {
    const { token, gardenId } = await setup();
    const c = await request(app).post('/api/journal').set(auth(token)).send({ gardenId, type: 'note', note: 'draft' });
    const id = c.body.entry.id as string;

    const upd = await request(app).patch(`/api/journal/${id}`).set(auth(token)).send({ note: 'edited' });
    expect(upd.body.entry.note).toBe('edited');

    const other = await setup();
    expect((await request(app).delete(`/api/journal/${id}`).set(auth(other.token))).status).toBe(404);

    expect((await request(app).delete(`/api/journal/${id}`).set(auth(token))).status).toBe(200);
    expect((await request(app).get('/api/journal').set(auth(token))).body.entries.length).toBe(0);
  });

  it('uploads a photo and serves it publicly', async () => {
    const { token, gardenId } = await setup();
    const c = await request(app).post('/api/journal').set(auth(token)).send({ gardenId, type: 'note', note: 'with pic' });
    const id = c.body.entry.id as string;

    const up = await request(app)
      .post(`/api/journal/${id}/photo`)
      .set(auth(token))
      .attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.entry.photoUrl).toContain('/api/journal/photo/');
    const fileId = up.body.entry.photoFileId as string;

    // Public serve — no auth header.
    const img = await request(app).get(`/api/journal/photo/${fileId}`);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toContain('image');
  });

  it('rejects a non-image photo upload (400)', async () => {
    const { token, gardenId } = await setup();
    const c = await request(app).post('/api/journal').set(auth(token)).send({ gardenId, type: 'note', note: 'x' });
    const id = c.body.entry.id as string;
    const up = await request(app)
      .post(`/api/journal/${id}/photo`)
      .set(auth(token))
      .attach('photo', Buffer.from('hello'), { filename: 'n.txt', contentType: 'text/plain' });
    expect(up.status).toBe(400);
  });

  it('harvest logs flow into stats + unlock the First Harvest achievement', async () => {
    const { token, gardenId, plantId } = await setup();
    await request(app)
      .post('/api/journal')
      .set(auth(token))
      .send({ gardenId, plantId, type: 'harvest', quantity: 3, unit: 'count' });

    const stats = await request(app).get('/api/users/stats').set(auth(token));
    expect(stats.body.stats.harvestLogs).toBe(1);

    const ach = await request(app).get('/api/users/achievements').set(auth(token));
    const firstHarvest = ach.body.achievements.find((a: { id: string }) => a.id === 'first_harvest');
    expect(firstHarvest.unlocked).toBe(true);
  });
});
