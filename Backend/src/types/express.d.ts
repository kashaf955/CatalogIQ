export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
      };
      tenant?: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        status: string;
      };
      membership?: {
        role: "owner" | "admin" | "reviewer" | "member";
      };
    }
  }
}
