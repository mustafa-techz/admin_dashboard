import { User, CreateUserData, UpdateUserData } from "@/types/user";
import { auth } from "@/firebase/auth";

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
    const response = await fetch("/api/users/get", {
      headers: await getAuthHeaders(false),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    return response.json();
  },

  createUser: async (userData: CreateUserData): Promise<{ success: boolean; uid: string }> => {
    const response = await fetch("/api/users/create", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create user");
    }
    return response.json();
  },

  updateUser: async (userData: UpdateUserData): Promise<{ success: boolean }> => {
    const response = await fetch("/api/users/update", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update user");
    }
    return response.json();
  },

  deleteUser: async (uid: string): Promise<{ success: boolean }> => {
    const response = await fetch("/api/users/delete", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ uid }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete user");
    }
    return response.json();
  },
};
