import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

// JwtAuthGuard assigns the verified payload to request.user, but express's own
// Request type knows nothing about that — this is what makes req.user typed.
// `user` is non-optional because the guard rejects the request before the
// handler runs, so by this point it is always populated.
//
// Lives here rather than in a controller so every guarded module can use it
// without importing another feature module's controller.
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}
