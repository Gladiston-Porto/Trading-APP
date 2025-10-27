import type { Request, Response, NextFunction } from 'express';
import AuthService from '../../services/AuthService';
import logger from '../../utils/logger';

/**
 * Middleware de Autenticação
 * Valida JWT no header Authorization: Bearer <token>
 * Attach usuário ao request se válido
 */
export const authMiddleware = (
  req: any,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Buscar token no header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Token não fornecido',
        code: 'NO_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Validar token
    const decoded = AuthService.validateToken(token);

    // Attach ao request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug(`Usuário autenticado: ${decoded.email}`);
    next();
  } catch (error) {
    logger.warn('Erro na autenticação:', error);
    res.status(401).json({
      error: 'Token inválido ou expirado',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Middleware RBAC (Role-Based Access Control)
 * Verifica se usuário tem permissão para acessar a rota
 * @param allowedRoles Array de roles permitidas
 */
export const rbacMiddleware = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction): void => {
    try {
      // Usuário deve estar autenticado
      if (!req.user) {
        res.status(401).json({
          error: 'Não autenticado',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Verificar role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Acesso negado para usuário ${req.user.email} com role ${req.user.role}`);
        res.status(403).json({
          error: 'Acesso negado',
          code: 'FORBIDDEN',
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        });
        return;
      }

      logger.debug(`Acesso permitido para ${req.user.email} em rota protegida`);
      next();
    } catch (error) {
      logger.error('Erro no middleware RBAC:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Middleware de validação de DTO com Joi
 * @param schema Schema Joi para validação
 */
export const validateDto = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details: Record<string, string> = {};
        error.details.forEach((err: any) => {
          details[err.path.join('.')] = err.message;
        });

        res.status(400).json({
          error: 'Validação falhou',
          code: 'VALIDATION_ERROR',
          details,
        });
        return;
      }

      // Attach validated data ao request
      req.body = value;
      next();
    } catch (error) {
      logger.error('Erro na validação:', error);
      res.status(500).json({
        error: 'Erro ao validar dados',
        code: 'VALIDATION_ERROR',
      });
    }
  };
};

/**
 * Middleware de error handling para rotas auth
 * Trata erros específicos de autenticação
 */
export const authErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Erro em rota de autenticação:', err);

  if (err.message.includes('Email já está registrado')) {
    res.status(409).json({
      error: err.message,
      code: 'EMAIL_ALREADY_REGISTERED',
    });
    return;
  }

  if (err.message.includes('Email ou senha incorretos')) {
    res.status(401).json({
      error: err.message,
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  if (err.message.includes('Token inválido')) {
    res.status(401).json({
      error: err.message,
      code: 'INVALID_TOKEN',
    });
    return;
  }

  res.status(500).json({
    error: 'Erro ao processar autenticação',
    code: 'AUTH_ERROR',
  });
};
