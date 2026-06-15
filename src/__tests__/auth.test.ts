/**
 * Auth API integration tests — signup, login, /me, and the protect middleware.
 * Runs against the real Express app + an in-memory MongoDB (supertest).
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createApp } from '../app';
import { User } from '../models/User';

const app = createApp();
const valid = { name: 'Alex Virdee', email: 'Alex@Example.com', password: 'Password123!' };

describe('POST /api/auth/signup', () => {
  it('creates a user and returns token + public user (201)', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      name: 'Alex Virdee',
      email: 'alex@example.com',
      authProvider: 'credentials',
      avatar: null,
    });
    expect(res.body.user.id).toBeDefined();
  });

  it('lowercases the email', async () => {
    await request(app).post('/api/auth/signup').send(valid);
    expect(await User.findOne({ email: 'alex@example.com' })).not.toBeNull();
  });

  it('hashes the password and never returns passwordHash', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.body.user.passwordHash).toBeUndefined();
    const user = await User.findOne({ email: 'alex@example.com' }).select('+passwordHash');
    expect(user!.passwordHash).toBeDefined();
    expect(user!.passwordHash).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, user!.passwordHash!)).toBe(true);
  });

  it('embeds userId in the JWT', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    const decoded = jwt.decode(res.body.token) as { userId?: string };
    expect(decoded.userId).toBe(res.body.user.id);
  });

  it('rejects a duplicate email (409)', async () => {
    await request(app).post('/api/auth/signup').send(valid);
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid email (400)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password (400)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...valid, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing name (400)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const creds = { name: 'Alex', email: 'alex@example.com', password: 'Password123!' };
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(creds);
  });

  it('logs in with correct credentials → 200, token + user, no passwordHash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('alex@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('works with email case differences', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ALEX@EXAMPLE.COM', password: creds.password });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  it('does not reveal whether an email exists (same 401 message)', async () => {
    const wrongPw = await request(app).post('/api/auth/login').send({ email: creds.email, password: 'WrongPassword1' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'WrongPassword1' });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(noUser.body.message).toBe(wrongPw.body.message);
  });
});

describe('GET /api/auth/me', () => {
  let token: string;
  let userId: string;
  beforeEach(async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Alex', email: 'alex@example.com', password: 'Password123!' });
    token = res.body.token;
    userId = res.body.user.id;
  });

  it('returns the user with a valid token (200)', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a missing token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token (401)', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('rejects an expired token (401)', async () => {
    const expired = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe('protect middleware', () => {
  it('allows a protected route with a valid token and scopes to that user', async () => {
    const signup = await request(app).post('/api/auth/signup').send({ name: 'Alex', email: 'alex@example.com', password: 'Password123!' });
    const ok = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${signup.body.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.user.id).toBe(signup.body.user.id);
  });

  it('blocks a protected route when the token is missing (401)', async () => {
    // /api/gardens is protected by the same `protect` middleware.
    const res = await request(app).get('/api/gardens');
    expect(res.status).toBe(401);
  });
});
