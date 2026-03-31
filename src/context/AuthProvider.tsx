"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { auth } from "@/firebase/auth"
import { onAuthStateChanged, User } from "firebase/auth"
import { useAuthStore } from "@/store/authStore"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { login, logout } = useAuthStore()

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        // Sync with Zustand store
        // For now, we'll default to 'admin' role if not specified
        // In a real app, you'd fetch this from Firestore custom claims
        login(currentUser.email || '', 'admin');
      } else {
        logout();
      }
      
      setLoading(false)
    })

    // Clean up subscription on unmount
    return () => unsubscribe()
  }, [login, logout])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
