"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { MOCK_CURRENT_USER } from "@/lib/mockData";
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle as firebaseGoogleLogin,
  logoutUser,
  subscribeToAuthChanges,
} from "@/lib/firebase/auth";
import {
  ensureMessageEncryptionKey,
  isMessageEncryptionKeyMismatchError,
} from "@/lib/firebase/messaging";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  demoLogin: () => void;
  logout: () => Promise<void>;
  updateUser: (partialUser: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  demoLogin: () => {},
  logout: async () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const hasFirebaseEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (hasFirebaseEnv) {
      try {
        const unsubscribe = subscribeToAuthChanges(async (profile) => {
          if (profile) {
            try {
              await ensureMessageEncryptionKey(profile.id);
            } catch (keyError) {
              if (isMessageEncryptionKeyMismatchError(keyError)) {
                console.warn(
                  "Message encryption key recovery required for this browser."
                );
              } else {
                console.warn("Message encryption key initialization failed:", keyError);
              }
            }
            setUser(profile);
          } else {
            // Check if user is logged in via demo session fallback
            const savedDemo =
              typeof window !== "undefined"
                ? sessionStorage.getItem("demo_user")
                : null;
            setUser(savedDemo ? JSON.parse(savedDemo) : null);
          }
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (err) {
        console.warn("Firebase Auth listener error:", err);
        queueMicrotask(() => setLoading(false));
      }
    } else {
      const savedDemo =
        typeof window !== "undefined"
          ? sessionStorage.getItem("demo_user")
          : null;
      queueMicrotask(() => {
        setUser(savedDemo ? JSON.parse(savedDemo) : null);
        setLoading(false);
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        const profile = await loginWithEmail(email, password);
        setUser(profile);
      } else {
        const demoUser = { ...MOCK_CURRENT_USER, email };
        setUser(demoUser);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("demo_user", JSON.stringify(demoUser));
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        const profile = await registerWithEmail(email, password, name);
        setUser(profile);
      } else {
        const demoUser = { ...MOCK_CURRENT_USER, email, name };
        setUser(demoUser);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("demo_user", JSON.stringify(demoUser));
        }
      }
    } catch (err) {
      console.error("Registration failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        const profile = await firebaseGoogleLogin();
        setUser(profile);
      } else {
        setUser(MOCK_CURRENT_USER);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("demo_user", JSON.stringify(MOCK_CURRENT_USER));
        }
      }
    } catch (err) {
      console.error("Google sign in failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = () => {
    setUser(MOCK_CURRENT_USER);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_user", JSON.stringify(MOCK_CURRENT_USER));
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        await logoutUser();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("demo_user");
      }
      setUser(null);
      setLoading(false);
    }
  };

  const updateUser = (partialUser: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialUser };
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && typeof window !== "undefined") {
        sessionStorage.setItem("demo_user", JSON.stringify(updated));
      } else if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`cd_user_profile_${updated.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, demoLogin, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
