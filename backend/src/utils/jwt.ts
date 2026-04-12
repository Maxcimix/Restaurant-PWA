import jwt from 'jsonwebtoken';

const SECRET  = process.env.JWT_SECRET ?? 'change-this-secret-in-production';
const EXPIRES = process.env.JWT_EXPIRES ?? '8h';

export function generateToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): jwt.JwtPayload | string {
  return jwt.verify(token, SECRET);
}