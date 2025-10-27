import request from 'supertest';
import express, { Express } from 'express';
import authRouter from '../../api/routes/auth.routes';
import { authMiddleware } from '../../api/middleware/auth.middleware';
import AuthService from '../../services/AuthService';
import prisma from '../../config/prisma';

/**
 * Testes de Integração - Auth API
 * Validar fluxo completo: register → login → protected route → refresh
 */

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/auth', authRouter);

  // Rota protegida para testes
  app.get('/protected', authMiddleware, (req: any, res) => {
    res.json({
      message: 'Acesso concedido',
      user: req.user,
    });
  });
});

describe('Auth Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  describe('POST /auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          passwordConfirm: testPassword,
          name: 'Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.role).toBe('TRADER');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
      userId = response.body.data.id;
    });

    it('deve rejeitar registro com email já existente', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          passwordConfirm: testPassword,
          name: 'Test User',
        })
        .expect(409);
    });

    it('deve rejeitar registro com dados inválidos', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'weak',
          passwordConfirm: 'weak',
          name: '',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve rejeitar registro com senhas não correspondentes', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `different-${Date.now()}@example.com`,
          password: testPassword,
          passwordConfirm: 'DifferentPassword123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.email).toBe(testEmail);

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('deve rejeitar login com email incorreto', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('deve rejeitar login com senha incorreta', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('deve rejeitar login com dados inválidos', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    it('deve retornar dados do usuário autenticado', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.role).toBe('TRADER');
    });

    it('deve rejeitar sem token', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);
    });

    it('deve rejeitar com token inválido', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /auth/refresh', () => {
    it('deve renovar token com refresh token válido', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');

      // Salvar novo token
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('deve rejeitar com refresh token inválido', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('deve rejeitar sem refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/logout', () => {
    it('deve fazer logout de usuário autenticado', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('deve rejeitar logout sem token', async () => {
      await request(app)
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Rotas Protegidas', () => {
    let newAccessToken: string;

    beforeAll(async () => {
      // Fazer login para obter novo token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      newAccessToken = loginResponse.body.data.accessToken;
    });

    it('deve acessar rota protegida com token válido', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Acesso concedido');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('role');
    });

    it('deve rejeitar rota protegida sem token', async () => {
      await request(app)
        .get('/protected')
        .expect(401);
    });

    it('deve rejeitar rota protegida com token inválido', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('deve rejeitar rota protegida com token malformado', async () => {
      await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('Token Lifecycle', () => {
    it('access token deve ter expiração curta (15m)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      const tokenData = response.body.data;
      expect(tokenData.expiresIn).toBe('15m');
    });

    it('deve poder renovar token antes de expirar', async () => {
      // Fazer login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      const oldRefreshToken = loginResponse.body.data.refreshToken;

      // Renovar
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: oldRefreshToken,
        })
        .expect(200);

      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('Security', () => {
    it('não deve retornar senha no response de registro', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `security-test-${Date.now()}@example.com`,
          password: testPassword,
          passwordConfirm: testPassword,
          name: 'Security Test',
        });

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('não deve retornar senha no response de login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('não deve retornar senha no response de /auth/me', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('deve rejeitar SQL injection em email', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: "' OR '1'='1",
          password: testPassword,
        })
        .expect(400);
    });

    it('deve sanitizar dados de entrada', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `sanitize-${Date.now()}@example.com`,
          password: testPassword,
          passwordConfirm: testPassword,
          name: '<script>alert("xss")</script>',
        });

      // Nome deve ser sanitizado (sem tags HTML)
      expect(response.body.data.name).not.toContain('<script>');
    });
  });
});
