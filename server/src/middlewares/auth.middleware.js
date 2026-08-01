import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db.js';


const verifyUserToken = async (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication token missing' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, name: true, phoneNumber: true, skills: true }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return null;
    }

    req.user = user;
    return user;
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ success: false, message });
    return null;
  }
};

export const AuthMiddleware = async (req, res, next) => {
  const user = await verifyUserToken(req, res);
  if (!user) return;
  next();
};

export const AdminMiddleware = async (req, res, next) => {
  const user = await verifyUserToken(req, res);
  if (!user) return;
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied: Requires Admin privileges' });
  }

  next();
};

export const VolunteerMiddleware = async (req, res, next) => {
  const user = await verifyUserToken(req, res);
  if (!user) return;

  if (user.role !== 'VOLUNTEER' && user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied: Requires Volunteer or Admin privileges' });
  }

  next();
};
