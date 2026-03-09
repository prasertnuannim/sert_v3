export type UserRoleValue =
  | string
  | {
      id?: string;
      name: string;
    }
  | null;

export type FullUser = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
