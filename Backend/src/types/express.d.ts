// Fields the `authenticate` middleware adds to every authenticated request.
// They are declared as always present because every route that reads them
// runs behind `authenticate`; public routes must not read them.

export type Role = "owner" | "manager";

export interface RequestUser {
  id: string;
  name: string;
  email: string;
}

export interface RequestTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  autoAcceptScore: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user: RequestUser;
      tenant: RequestTenant;
      membership: { role: Role };
    }
  }
}
