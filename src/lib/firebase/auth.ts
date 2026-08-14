import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./config";
import { UserProfile } from "@/types";

const CACHE_PROFILE_PREFIX = "cd_user_profile_";

function getCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PROFILE_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(uid: string, profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_PROFILE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {}
}

/**
 * Creates or updates user profile document in Firestore `users/{uid}`
 * Safe against Firestore permission errors or offline modes.
 */
export async function syncUserProfile(
  user: User,
  extraData?: Partial<UserProfile>
): Promise<UserProfile> {
  const cachedProfile = getCachedProfile(user.uid);

  const fallbackProfile: UserProfile = {
    id: user.uid,
    name: user.displayName || extraData?.name || user.email?.split("@")[0] || "Mentor Dojo",
    email: user.email || "",
    avatar:
      user.photoURL ||
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAnY27tF1psmB7nUzX-kSEmd76nTuzC9Jl9pcZFTDb6O9-9JwaX58JYdcGct3SJvJfle5QGhdrl7Vk_e1qs5T6tBT9GVg8LDFoy0VxZEOGD0PqbrcaL4_R6veDy4k0y3-Q1HlRyLWC7X9G9mwpHzaQp2d6nipxFNe-JkQqUEv56Fi0qtxpn0QG9qmsHHqHl0z3U-EKB3P3DhR8WXgh2W702zkujOICGyevjyMVL-XZsc9AfuJRbqwJ3",
    bio: "Mentor passionné chez CoderDojo Fianarantsoa.",
    skills: ["Scratch", "Python"],
    role: "MENTOR",
    status: cachedProfile?.status || "PENDING",
    xp: 100,
    level: 1,
    badges: [],
    workshopsCount: 0,
    studentsCount: 0,
    memoriesCount: 0,
    createdAt: new Date().toISOString(),
    ...cachedProfile,
  };

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const merged = { ...fallbackProfile, ...(userSnap.data() as UserProfile), id: user.uid };
      setCachedProfile(user.uid, merged);
      return merged;
    }

    const newProfile = {
      ...fallbackProfile,
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    setCachedProfile(user.uid, fallbackProfile);
    return fallbackProfile;
  } catch (err) {
    console.warn("Firestore profile sync warning (using cached/fallback profile):", err);
    if (cachedProfile) {
      return cachedProfile;
    }
    return fallbackProfile;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return syncUserProfile(res.user);
}

export async function registerWithEmail(email: string, pass: string, name: string) {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  return syncUserProfile(res.user, { name });
}

export async function loginWithGoogle() {
  const res = await signInWithPopup(auth, googleProvider);
  return syncUserProfile(res.user);
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (userProfile: UserProfile | null) => void) {
  return firebaseOnAuthStateChanged(
    auth,
    async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          callback(profile);
        } catch (err) {
          console.warn("Auth state change sync failed, using cached/fallback:", err);
          const cached = getCachedProfile(firebaseUser.uid);
          if (cached) {
            callback(cached);
          } else {
            callback({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Mentor Dojo",
              email: firebaseUser.email || "",
              avatar:
                firebaseUser.photoURL ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAnY27tF1psmB7nUzX-kSEmd76nTuzC9Jl9pcZFTDb6O9-9JwaX58JYdcGct3SJvJfle5QGhdrl7Vk_e1qs5T6tBT9GVg8LDFoy0VxZEOGD0PqbrcaL4_R6veDy4k0y3-Q1HlRyLWC7X9G9mwpHzaQp2d6nipxFNe-JkQqUEv56Fi0qtxpn0QG9qmsHHqHl0z3U-EKB3P3DhR8WXgh2W702zkujOICGyevjyMVL-XZsc9AfuJRbqwJ3",
              bio: "Mentor passionné chez CoderDojo Fianarantsoa.",
              skills: ["Scratch", "Python"],
              role: "MENTOR",
              status: "PENDING",
              xp: 100,
              level: 1,
              badges: [],
              createdAt: new Date().toISOString(),
            });
          }
        }
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("firebaseOnAuthStateChanged listener error:", err);
      callback(null);
    }
  );
}

