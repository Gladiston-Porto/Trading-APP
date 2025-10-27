import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import config from '../../config/env';
import logger from '../../utils/logger';
import { AuthResponseDto, RegisterDto, LoginDto } from '../dto/auth.dto';

const prisma = new PrismaClient();

/**
 * AuthService
 * Responsável por:
 * - Registro de novos usuários
 * - Login com validação de senha
 * - Geração de JWT + Refresh tokens
 * - Validação de tokens
 * - Refresh de tokens expirados
 */
export class AuthService {
  /**
   * Registra um novo usuário
   * @param dto { email, password, name }
   * @returns AuthResponseDto com tokens
   * @throws Error se email já existe
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Verificar se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        logger.warn(`Tentativa de registro com email duplicado: ${dto.email}`);
        throw new Error('Email já está registrado');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(dto.password, config.bcrypt_rounds);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name || null,
          role: 'TRADER', // Default role
        },
      });

      logger.info(`Novo usuário registrado: ${user.email}`);

      // Gerar tokens
      const tokens = this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'ADMIN' | 'TRADER' | 'VIEW',
        },
      };
    } catch (error) {
      logger.error('Erro ao registrar usuário:', error);
      throw error;
    }
  }

  /**
   * Login com email e senha
   * @param dto { email, password }
   * @returns AuthResponseDto com tokens
   * @throws Error se email não existe ou senha incorreta
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        logger.warn(`Tentativa de login com email não registrado: ${dto.email}`);
        throw new Error('Email ou senha incorretos');
      }

      // Verificar se usuário está ativo
      if (!user.active) {
        logger.warn(`Tentativa de login com usuário inativo: ${user.email}`);
        throw new Error('Usuário está inativo');
      }

      // Validar senha
      const passwordMatch = await bcrypt.compare(dto.password, user.password);

      if (!passwordMatch) {
        logger.warn(`Tentativa de login com senha incorreta: ${dto.email}`);
        throw new Error('Email ou senha incorretos');
      }

      logger.info(`Login bem-sucedido: ${user.email}`);

      // Gerar tokens
      const tokens = this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'ADMIN' | 'TRADER' | 'VIEW',
        },
      };
    } catch (error) {
      logger.error('Erro ao fazer login:', error);
      throw error;
    }
  }

  /**
   * Refresh token expirado
   * Valida o refresh token e gera novo access token
   * @param refreshToken Token de refresh
   * @returns Novos tokens
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Validar refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, config.jwt_refresh_secret);
      } catch (error) {
        logger.warn('Refresh token inválido ou expirado');
        throw new Error('Refresh token inválido ou expirado');
      }

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.active) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      logger.info(`Refresh token para usuário: ${user.email}`);

      // Gerar novos tokens
      const tokens = this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'ADMIN' | 'TRADER' | 'VIEW',
        },
      };
    } catch (error) {
      logger.error('Erro ao fazer refresh de token:', error);
      throw error;
    }
  }

  /**
   * Validar access token
   * @param token JWT access token
   * @returns { userId, email, role }
   */
  validateToken(token: string): { userId: string; email: string; role: string } {
    try {
      const decoded = jwt.verify(token, config.jwt_secret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      logger.warn('Token inválido ou expirado:', error);
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Gerar JWT + Refresh tokens
   * @private
   */
  private generateTokens(
    userId: string,
    email: string,
    role: string
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    // Access token (curta duração)
    const accessToken = jwt.sign(
      {
        userId,
        email,
        role,
      },
      config.jwt_secret,
      {
        expiresIn: config.jwt_expiration,
      }
    );

    // Refresh token (longa duração)
    const refreshToken = jwt.sign(
      {
        userId,
        email,
      },
      config.jwt_refresh_secret,
      {
        expiresIn: config.jwt_refresh_expiration,
      }
    );

    // Parse expiration time (ex: "15m" → 900 seconds)
    const expiresInSeconds = this.parseExpirationTime(config.jwt_expiration);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Parse expiration time string para segundos
   * @private
   */
  private parseExpirationTime(expirationStr: string): number {
    const match = expirationStr.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}

export default new AuthService();
