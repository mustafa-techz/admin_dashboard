"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { auth } from "@/firebase/auth"
import { onIdTokenChanged, User } from "firebase/auth"
import { useAuthStore } from "@/store/authStore"
import { db } from "@/firebase/firestore"
import { doc, getDoc } from "firebase/firestore"
import { normalizeUserRole, UserRole } from "@/types/user"

const AUTH_COOKIE_NAME = "firebase-auth-token"
const ROLE_COOKIE_NAME = "user-role"

const setBrowserCookie = (name: string, value: string, maxAge = 60 * 60) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

const clearBrowserCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

const getUserRole = async (currentUser: User): Promise<UserRole | null> => {
  const tokenResult = await currentUser.getIdTokenResult()
  const claimedRole = normalizeUserRole(tokenResult.claims.role)

  if (claimedRole) {
    return claimedRole
  }

  const userSnapshot = await getDoc(doc(db, "users", currentUser.uid))
  const storedRole = normalizeUserRole(userSnapshot.data()?.role)

  return storedRole;
}

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
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (!currentUser) {
        clearBrowserCookie(AUTH_COOKIE_NAME)
        clearBrowserCookie(ROLE_COOKIE_NAME)
        logout()
        setLoading(false)
        return
      }

      try {
        const role = await getUserRole(currentUser)
        const token = await currentUser.getIdToken()

        if (role) {
          login(
            {
              id: currentUser.uid,
              name: currentUser.displayName || currentUser.email || "User",
              email: currentUser.email || "",
              role,
            },
            role
          )

          setBrowserCookie(AUTH_COOKIE_NAME, token)
          setBrowserCookie(ROLE_COOKIE_NAME, role)
        } else {
          console.warn("No role found for user:", currentUser.uid)
          // Still set the auth token but clear the role cookie
          setBrowserCookie(AUTH_COOKIE_NAME, token)
          clearBrowserCookie(ROLE_COOKIE_NAME)
          logout()
        }
      } catch (error) {
        console.error("Failed to resolve authenticated user role:", error)
        logout()
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [login, logout])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
