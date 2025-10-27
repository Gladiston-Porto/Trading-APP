import type { Request, Response } from 'express';
import { Router } from 'express';
import AuthService from '../../services/AuthService';
import { validateDto, authMiddleware, authErrorHandler } from '../middleware/auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../dto/auth.dto';
import logger from '../../utils/logger';

const authRouter = Router();

/**
 * POST /auth/register
 * Registra um novo usuário
 * Body: { email, password, passwordConfirm, name }
 */
authRouter.post(
  '/register',
  validateDto(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      logger.info(`Tentativa de registro: ${email}`);

      const result = await AuthService.register({
        email,
        password,
        name,
      });

      logger.info(`Usuário registrado com sucesso: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
      });
    } catch (error) {
      authErrorHandler(error, req as any, res, () => {});
    }
  }
);

/**
 * POST /auth/login
 * Faz login de um usuário
 * Body: { email, password }
 */
authRouter.post(
  '/login',
  validateDto(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      logger.info(`Tentativa de login: ${email}`);

      const result = await AuthService.login({
        email,
        password,
      });

      logger.info(`Login bem-sucedido: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
      });
    } catch (error) {
      authErrorHandler(error, req as any, res, () => {});
    }
  }
);

/**
 * POST /auth/refresh
 * Renova o access token usando refresh token
 * Body: { refreshToken }
 */
authRouter.post(
  '/refresh',
  validateDto(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      logger.info('Tentativa de renovação de token');

      const result = await AuthService.refreshToken(refreshToken);

      logger.info('Token renovado com sucesso');

      res.status(200).json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      authErrorHandler(error, req as any, res, () => {});
    }
  }
);

/**
 * POST /auth/logout
 * Faz logout do usuário (apenas limpa token no cliente)
 * Requer autenticação
 */
authRouter.post(
  '/logout',
  authMiddleware,
  async (req: any, res: Response) => {
    try {
      logger.info(`Logout do usuário: ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (error) {
      logger.error('Erro no logout:', error);
      res.status(500).json({
        error: 'Erro ao fazer logout',
        code: 'LOGOUT_ERROR',
      });
    }
  }
);

/**
 * GET /auth/me
 * Retorna dados do usuário autenticado
 * Requer autenticação
 */
authRouter.get(
  '/me',
  authMiddleware,
  async (req: any, res: Response) => {
    try {
      logger.debug(`Requisição /auth/me do usuário: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar usuário autenticado:', error);
      res.status(500).json({
        error: 'Erro ao buscar dados do usuário',
        code: 'USER_ERROR',
      });
    }
  }
);

export default authRouter;
