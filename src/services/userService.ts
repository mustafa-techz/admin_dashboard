import { User, CreateUserData, UpdateUserData } from "@/types/user";
import { auth } from "@/firebase/auth";
import { executeApiOp } from "@/lib/api-errors";

const getAuthHeaders = async (contentType = true) => {
  const headers = new Headers();

  if (contentType) {
    headers.set("Content-Type", "application/json");
  }

  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
};

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return executeApiOp<User[]>(async () => 
      fetch("/api/users/get", {
        headers: await getAuthHeaders(false),
        cache: "no-store",
      }), 
      "getUsers"
    );
  },

  createUser: async (userData: CreateUserData): Promise<{ success: boolean; uid: string }> => {
    return executeApiOp<{ success: boolean; uid: string }>(async () =>
      fetch("/api/users/create", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(userData),
      }),
      "createUser"
    );
  },

  updateUser: async (userData: UpdateUserData): Promise<{ success: boolean }> => {
    return executeApiOp<{ success: boolean }>(async () =>
      fetch("/api/users/update", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(userData),
      }),
      "updateUser"
    );
  },

  deleteUser: async (uid: string): Promise<{ success: boolean }> => {
    return executeApiOp<{ success: boolean }>(async () =>
      fetch("/api/users/delete", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ uid }),
      }),
      "deleteUser"
    );
  },
};
