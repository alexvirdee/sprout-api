/**
 * Care feature tests — the rules engine + the CareTask API (CRUD, complete/skip/
 * reschedule, upcoming query, ownership, and plant care suggestions).
 */

import request from 'supertest';

import { createApp } from '../app';
import { suggestCareForPlant } from '../services/careSuggestion.service';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const DAY = 86_400_000;
let n = 0;

async function setup() {
  n += 1;
  const s = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Care', email: `care${Date.now()}-${n}@example.com`, password: 'Password123!' });
  const token = s.body.token as string;
  const g = await request(app).post('/api/gardens').set(auth(token)).send({ name: 'Care Garden' });
  const gardenId = g.body.garden.id as string;
  const p = await request(app).post('/api/plants').set(auth(token)).send({ gardenId, name: 'Basil', type: 'herb' });
  const plantId = p.body.plant.id as string;
  return { token, gardenId, plantId };
}

describe('care suggestion rules', () => {
  it('herb → water (2d) + pinch + harvest', () => {
    const s = suggestCareForPlant({ name: 'Basil', type: 'herb' });
    const keys = s.map((x) => x.key);
    expect(keys).toEqual(expect.arrayContaining(['water', 'prune', 'harvest']));
    expect(s.find((x) => x.key === 'water')?.recurrenceIntervalDays).toBe(2);
  });
  it('tomato (by name) → fertilize + prune suckers', () => {
    const s = suggestCareForPlant({ name: 'Roma Tomato', type: 'vegetable' });
    expect(s.some((x) => x.taskType === 'fertilizing')).toBe(true);
    expect(s.some((x) => /sucker/i.test(x.title))).toBe(true);
  });
  it('hydrangea → careful yearly pruning disclaimer', () => {
    const s = suggestCareForPlant({ name: 'Hydrangea', type: 'shrub' });
    const prune = s.find((x) => x.key === 'prune');
    expect(prune?.recurrence).toBe('yearly');
    expect(prune?.instructions).toMatch(/old wood|new wood/i);
  });
  it('houseplant → weekly water', () => {
    const s = suggestCareForPlant({ name: 'Pothos', type: 'houseplant' });
    expect(s.find((x) => x.key === 'water')?.recurrenceIntervalDays).toBe(7);
  });
  it('unknown → generic water + weekly check', () => {
    const s = suggestCareForPlant({ name: 'Mystery', type: 'other' });
    expect(s.some((x) => x.key === 'check')).toBe(true);
  });
});

describe('care tasks API', () => {
  it('rejects unauthenticated requests', async () => {
    expect((await request(app).get('/api/care-tasks')).status).toBe(401);
  });

  it('creates a task and lists it as pending', async () => {
    const { token, gardenId } = await setup();
    const create = await request(app)
      .post('/api/care-tasks')
      .set(auth(token))
      .send({ gardenId, title: 'Water now', taskType: 'watering', dueDate: new Date().toISOString() });
    expect(create.status).toBe(201);
    expect(create.body.task.status).toBe('pending');
    expect(create.body.task.source).toBe('user');
    const list = await request(app).get('/api/care-tasks').set(auth(token));
    expect(list.body.tasks.length).toBe(1);
  });

  it('rejects an invalid task type (400)', async () => {
    const { token, gardenId } = await setup();
    const res = await request(app)
      .post('/api/care-tasks')
      .set(auth(token))
      .send({ gardenId, title: 'x', taskType: 'nope', dueDate: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  it('rejects a task for a garden you do not own (404)', async () => {
    const a = await setup();
    const b = await setup();
    const res = await request(app)
      .post('/api/care-tasks')
      .set(auth(b.token))
      .send({ gardenId: a.gardenId, title: 'x', taskType: 'general', dueDate: new Date().toISOString() });
    expect(res.status).toBe(404);
  });

  it('completing a recurring task spawns the next occurrence', async () => {
    const { token, gardenId } = await setup();
    const create = await request(app).post('/api/care-tasks').set(auth(token)).send({
      gardenId,
      title: 'Water',
      taskType: 'watering',
      dueDate: new Date().toISOString(),
      recurrence: 'every_x_days',
      recurrenceIntervalDays: 2,
    });
    const done = await request(app).post(`/api/care-tasks/${create.body.task.id}/complete`).set(auth(token));
    expect(done.status).toBe(200);
    expect(done.body.task.status).toBe('completed');
    expect(done.body.next).not.toBeNull();
    expect(done.body.next.status).toBe('pending');

    expect((await request(app).get('/api/care-tasks?status=pending').set(auth(token))).body.tasks.length).toBe(1);
    expect((await request(app).get('/api/care-tasks?status=completed').set(auth(token))).body.tasks.length).toBe(1);
  });

  it('skips a task', async () => {
    const { token, gardenId } = await setup();
    const c = await request(app).post('/api/care-tasks').set(auth(token)).send({ gardenId, title: 'X', taskType: 'general', dueDate: new Date().toISOString() });
    const r = await request(app).post(`/api/care-tasks/${c.body.task.id}/skip`).set(auth(token));
    expect(r.body.task.status).toBe('skipped');
  });

  it('reschedules a task', async () => {
    const { token, gardenId } = await setup();
    const c = await request(app).post('/api/care-tasks').set(auth(token)).send({ gardenId, title: 'X', taskType: 'general', dueDate: new Date().toISOString() });
    const future = new Date(Date.now() + 5 * DAY).toISOString();
    const r = await request(app).post(`/api/care-tasks/${c.body.task.id}/reschedule`).set(auth(token)).send({ dueDate: future });
    expect(r.status).toBe(200);
    expect(new Date(r.body.task.dueDate).getTime()).toBeGreaterThan(Date.now() + 4 * DAY);
  });

  it('dueBefore returns only upcoming tasks', async () => {
    const { token, gardenId } = await setup();
    await request(app).post('/api/care-tasks').set(auth(token)).send({ gardenId, title: 'Soon', taskType: 'general', dueDate: new Date(Date.now() + DAY).toISOString() });
    await request(app).post('/api/care-tasks').set(auth(token)).send({ gardenId, title: 'Later', taskType: 'general', dueDate: new Date(Date.now() + 30 * DAY).toISOString() });
    const res = await request(app).get(`/api/care-tasks?dueBefore=${new Date(Date.now() + 7 * DAY).toISOString()}`).set(auth(token));
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].title).toBe('Soon');
  });

  it('enforces ownership on a single task (404 for another user)', async () => {
    const a = await setup();
    const c = await request(app).post('/api/care-tasks').set(auth(a.token)).send({ gardenId: a.gardenId, title: 'A', taskType: 'general', dueDate: new Date().toISOString() });
    const b = await setup();
    expect((await request(app).get(`/api/care-tasks/${c.body.task.id}`).set(auth(b.token))).status).toBe(404);
  });

  it('returns plant care suggestions and enables selected ones as tasks', async () => {
    const { token, plantId } = await setup();
    const sug = await request(app).get(`/api/plants/${plantId}/care-suggestions`).set(auth(token));
    expect(sug.status).toBe(200);
    expect(sug.body.suggestions.length).toBeGreaterThan(0);

    const enable = await request(app)
      .post(`/api/plants/${plantId}/enable-care-suggestions`)
      .set(auth(token))
      .send({ keys: ['water'] });
    expect(enable.status).toBe(201);
    expect(enable.body.tasks.length).toBe(1);
    expect(enable.body.tasks[0].taskType).toBe('watering');
    expect(enable.body.tasks[0].source).toBe('system');
    expect(String(enable.body.tasks[0].plantId)).toBe(plantId);
  });
});
