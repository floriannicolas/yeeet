import { Request, Response, NextFunction } from 'express';
import { getTokenFromRequest, validateSessionToken } from '../session';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (token) {
    const { user } = await validateSessionToken(token);
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
};
