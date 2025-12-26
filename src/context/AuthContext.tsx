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

// Keep this import as is
import { seedKPIsForUser } from "../utils/devSeedKPIs"; 

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
    const unsub = onAuthStateChanged(auth, async (u) => {
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
          setRole((data.role as Role) ?? "Unknown");
        } else {
          // ⭐ NEW LOGIC: Save email and uid so seeding scripts can find them
          const defaultRole: Role = "Employee";

          await setDoc(userRef, {
            uid: u.uid, // Explicitly store UID
            email: u.email, // ⭐ CRITICAL: Added email for the seeding script
            role: defaultRole,
            displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
            createdAt: serverTimestamp(),
          });

          setRole(defaultRole);
        }

        // Seeding call (currently a no-op per your file)
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
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
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