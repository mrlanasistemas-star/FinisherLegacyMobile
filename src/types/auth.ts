import type { User } from '@/types/models';

export interface AuthPayload {
  user: User;
  token: string;
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
