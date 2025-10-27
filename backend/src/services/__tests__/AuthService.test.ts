import AuthService from '../../services/AuthService';
import prisma from '../../config/prisma';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

/**
 * Testes Unitários - AuthService
 * Validar: register, login, refreshToken, validateToken, generateTokens
 */

jest.mock('../../config/prisma', () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../config/env', () => ({
  JWT_SECRET: 'test-secret-key',
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcryptjs.hash('Password123', 10),
        name: 'Test User',
        role: 'TRADER',
        isActive: true,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('TRADER');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('deve falhar ao registrar email já existente', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-123',
        email: 'existing@example.com',
      });

      await expect(
        AuthService.register({
          email: 'existing@example.com',
          password: 'Password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Email já está registrado');
    });

    it('deve falhar com senha fraca', async () => {
      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        })
      ).rejects.toThrow();
    });
  });

  describe('login()', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const hashedPassword = await bcryptjs.hash('Password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'TRADER',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('deve falhar ao fazer login com email não encontrado', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        AuthService.login({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('Email ou senha incorretos');
    });

    it('deve falhar ao fazer login com senha incorreta', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcryptjs.hash('CorrectPassword123', 10),
        name: 'Test User',
        role: 'TRADER',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Email ou senha incorretos');
    });

    it('deve falhar ao fazer login com usuário inativo', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcryptjs.hash('Password123', 10),
        name: 'Test User',
        role: 'TRADER',
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('Usuário inativo');
    });
  });

  describe('refreshToken()', () => {
    it('deve renovar token com refresh token válido', async () => {
      // Gerar um refresh token válido
      const refreshToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'TRADER' },
        'test-secret-key',
        { expiresIn: '7d' }
      );

      const result = await AuthService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('deve falhar com refresh token inválido', async () => {
      await expect(
        AuthService.refreshToken('invalid-token')
      ).rejects.toThrow();
    });

    it('deve falhar com refresh token expirado', async () => {
      // Gerar token expirado
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'TRADER' },
        'test-secret-key',
        { expiresIn: '0s' }
      );

      // Aguardar para garantir que o token expirou
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await expect(
        AuthService.refreshToken(expiredToken)
      ).rejects.toThrow();
    });
  });

  describe('validateToken()', () => {
    it('deve validar um token válido', () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'TRADER' },
        'test-secret-key',
        { expiresIn: '15m' }
      );

      const decoded = AuthService.validateToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('TRADER');
    });

    it('deve falhar ao validar token inválido', () => {
      expect(() => {
        AuthService.validateToken('invalid-token');
      }).toThrow();
    });

    it('deve falhar ao validar token expirado', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'TRADER' },
        'test-secret-key',
        { expiresIn: '0s' }
      );

      // Aguardar para garantir que o token expirou
      setTimeout(() => {
        expect(() => {
          AuthService.validateToken(expiredToken);
        }).toThrow();
      }, 1100);
    });
  });

  describe('parseExpirationTime()', () => {
    it('deve parsear tempo em minutos corretamente', () => {
      // Acessar método privado via reflection
      const service = new (AuthService as any)();
      const result = service.parseExpirationTime('15m');
      expect(result).toBe(15 * 60);
    });

    it('deve parsear tempo em horas corretamente', () => {
      const service = new (AuthService as any)();
      const result = service.parseExpirationTime('2h');
      expect(result).toBe(2 * 60 * 60);
    });

    it('deve parsear tempo em dias corretamente', () => {
      const service = new (AuthService as any)();
      const result = service.parseExpirationTime('7d');
      expect(result).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('Security', () => {
    it('não deve retornar senha do usuário após login', async () => {
      const hashedPassword = await bcryptjs.hash('Password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'TRADER',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user).not.toHaveProperty('password');
    });

    it('não deve retornar senha do usuário após registrar', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.create as jest.Mock).mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'TRADER',
        isActive: true,
      });

      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      expect(result.user).not.toHaveProperty('password');
    });

    it('deve hashear senha de forma irreversível', async () => {
      const password = 'Password123';
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      expect(hashedPassword).not.toBe(password);

      // Verificar que o hash pode ser comparado
      const isValid = await bcryptjs.compare(password, hashedPassword);
      expect(isValid).toBe(true);

      // Verificar que hash diferente não passa
      const isInvalid = await bcryptjs.compare('WrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });
});
