import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
    }
    interface Response extends ExpressResponse {}
  }
}

export {};
