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

import { seedKPIsForUser } from "../utils/devSeedKPIs";  // now a no-op

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

    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log("👤 Auth state changed:", u?.uid || "No User");

      setUser(u);

      if (!u) {
        setRole("Unknown");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          console.log("📄 User profile loaded:", data);
          setRole((data.role as Role) ?? "Unknown");
        } else {
          console.log("⚠️ No user profile found — creating one...");

          const defaultRole: Role = "Employee";

          await setDoc(userRef, {
            role: defaultRole,
            displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
            createdAt: serverTimestamp(),
          });

          setRole(defaultRole);
        }

        // 🌱 Seeding disabled — function safely no-ops
        await seedKPIsForUser(u.uid);

      } catch (err) {
        console.error("🔥 Error loading user doc:", err);
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
    console.log("🚪 Logging out");
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
