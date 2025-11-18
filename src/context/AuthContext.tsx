// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { seedKPIsForUser } from "../utils/devSeedKPIs"; // <-- added

type Role = "Employee" | "Manager" | "HR" | "Admin" | "Unknown";

interface AuthContextType {
  user: User | null;
  role: Role;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("Unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔥 Auth listener mounted");
    console.log("🔥 Firebase Project:", auth.app.options.projectId);

    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log("👤 Auth state changed. User:", u?.uid ?? "none");

      setUser(u);

      if (!u) {
        console.log("⚠️ No user logged in, setting role to Unknown.");
        setRole("Unknown");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          console.log("📄 User doc exists:", data);

          setRole((data.role as Role) ?? "Unknown");
        } else {
          console.log("⚠️ User doc missing — creating new user profile.");
          const defaultRole: Role = "Employee";

          await setDoc(userRef, {
            role: defaultRole,
            displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
            createdAt: serverTimestamp(),
          });

          setRole(defaultRole);
        }

        // 🌱 AUTO-SEED KPIs FOR DEVELOPMENT
        await seedKPIsForUser(u.uid);
      } catch (error) {
        console.error("🔥 Error loading/creating user doc:", error);
        setRole("Unknown");
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    console.log("🔐 Logging in:", email);
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    console.log("🚪 Logging out.");
    await signOut(auth);
    setRole("Unknown");
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
