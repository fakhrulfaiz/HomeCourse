import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function makeToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function authHeader(user: { id: string; email: string; role: string }) {
  return { Authorization: `Bearer ${makeToken(user)}` };
}
