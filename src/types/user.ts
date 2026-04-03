export type UserRole = "admin" | "sub-admin" | "teacher" | "parent";

export interface SerializedTimestamp {
  seconds: number;
  nanoseconds?: number;
}

export type UserTimestamp = SerializedTimestamp | string | null;

export const USER_ROLES: UserRole[] = ["admin", "sub-admin", "teacher", "parent"];

export const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
};

export const normalizeUserRole = (value: unknown): UserRole | null => {
  if (value === "subAdmin") {
    return "sub-admin";
  }

  return isUserRole(value) ? value : null;
};

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: UserTimestamp;
  updatedAt?: UserTimestamp;
}

export interface CreateUserData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface UpdateUserData {
  uid: string;
  name?: string;
  email?: string;
  role?: UserRole;
}
