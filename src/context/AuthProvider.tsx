"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { auth } from "@/firebase/auth"
import { onIdTokenChanged, User } from "firebase/auth"
import { useAuthStore } from "@/store/authStore"
import { db } from "@/firebase/firestore"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { normalizeUserRole } from "@/types/user"

const AUTH_COOKIE_NAME = "firebase-auth-token"
const ROLE_COOKIE_NAME = "user-role"

const setBrowserCookie = (name: string, value: string, maxAge = 60 * 60) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

const clearBrowserCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
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
        const userSnapshot = await getDoc(doc(db, "users", currentUser.uid))
        const userData = userSnapshot.data()
        
        let resolvedRole = normalizeUserRole(userData?.role)
        if (!resolvedRole) {
          const tokenResult = await currentUser.getIdTokenResult()
          resolvedRole = normalizeUserRole(tokenResult.claims.role)
        }
        
        const token = await currentUser.getIdToken()

        // For teachers, fetch their teacher document to get branchIds/classIds
        let teacherData: Record<string, any> | null = null;
        if (resolvedRole === 'teacher') {
          try {
            const teacherSnapshot = await getDoc(doc(db, "teachers", currentUser.uid));
            if (teacherSnapshot.exists()) {
              teacherData = teacherSnapshot.data();
            } else if (currentUser.email) {
              // Fallback for older accounts where doc ID isn't the auth UID
              const q = query(collection(db, "teachers"), where("email", "==", currentUser.email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                teacherData = querySnapshot.docs[0].data();
              }
            }
          } catch (teacherErr) {
            // Non-blocking
            console.warn("Could not fetch teacher doc:", teacherErr);
          }
        }

        if (resolvedRole) {
          login(
            {
              id: currentUser.uid,
              name: currentUser.displayName || currentUser.email || "User",
              email: currentUser.email || "",
              role: resolvedRole,
              studentRollNumber: userData?.studentRollNumber,
              // Teacher scope fields (from teacher doc or user doc)
              branchIds: teacherData?.branchIds || userData?.branchIds,
              branchId: teacherData?.branchId || userData?.branchId,
              classIds: teacherData?.classIds || userData?.classIds,
              classTeacherOf: teacherData?.classTeacher || userData?.classTeacherOf,
            },
            resolvedRole
          )

          setBrowserCookie(AUTH_COOKIE_NAME, token)
          setBrowserCookie(ROLE_COOKIE_NAME, resolvedRole)
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
