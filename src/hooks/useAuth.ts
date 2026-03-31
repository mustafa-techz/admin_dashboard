"use client"

import { useAuthContext } from "@/context/AuthProvider"

/**
 * Custom hook to easily access auth context
 */
export const useAuth = () => {
  const context = useAuthContext();
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
