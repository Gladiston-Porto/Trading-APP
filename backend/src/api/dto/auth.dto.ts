import Joi from 'joi';

// ==================== AUTH DTOs ====================

/**
 * DTO para Registro de novo usuário
 * Validações:
 * - Email: válido, único
 * - Senha: mín 8 chars, 1 maiúscula, 1 número
 * - Confirmação: deve corresponder
 */
export interface RegisterDto {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório',
    }),
  password: Joi.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .required()
    .messages({
      'string.min': 'Senha deve ter no mínimo 8 caracteres',
      'string.pattern.base': 'Senha deve conter pelo menos 1 maiúscula e 1 número',
      'any.required': 'Senha é obrigatória',
    }),
  passwordConfirm: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Senhas não correspondem',
      'any.required': 'Confirmação de senha é obrigatória',
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Nome deve ter no mínimo 2 caracteres',
    }),
});

/**
 * DTO para Login
 */
export interface LoginDto {
  email: string;
  password: string;
}

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha é obrigatória',
    }),
});

/**
 * DTO para Refresh Token
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token é obrigatório',
    }),
});

/**
 * DTO para resposta de Auth (Token)
 */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'TRADER' | 'VIEW';
  };
}

/**
 * DTO para erro de validação
 */
export interface ValidationErrorDto {
  error: string;
  details?: Record<string, string>;
  statusCode: number;
}
