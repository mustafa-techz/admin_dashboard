"use client"

import { logoutUser } from "@/services/auth.service"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await logoutUser();
      // AppLayout or onAuthStateChanged will handle redirection
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      <LogOut size={18} />
      <span>Logout</span>
    </button>
  )
}
