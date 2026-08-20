import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  BadgeItem,
  DetectiveScore,
  GuessWhoGame,
  MilestoneItem,
} from "@/types";
import { db } from "./config";

function handleGamificationError(error: unknown, source: string) {
  console.error(`[Firestore Error] ${source}:`, error);
}

export function subscribeToActiveGuessWho(
  callback: (game: GuessWhoGame | null) => void
) {
  const gamesQuery = query(
    collection(db, "guessWhoGames"),
    where("active", "==", true)
  );

  return onSnapshot(
    gamesQuery,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const games = snapshot.docs.map((document) => ({
        ...(document.data() as GuessWhoGame),
        id: document.id,
      }));
      games.sort((first, second) => {
        const firstTime = (first.createdAt as { toMillis?: () => number })?.toMillis?.() || 0;
        const secondTime = (second.createdAt as { toMillis?: () => number })?.toMillis?.() || 0;
        return secondTime - firstTime;
      });
      callback(games[0]);
    },
    (error) => handleGamificationError(error, "subscribeToActiveGuessWho")
  );
}

export async function createGuessWhoGame(game: Omit<GuessWhoGame, "id">) {
  return addDoc(collection(db, "guessWhoGames"), {
    ...game,
    createdAt: serverTimestamp(),
  });
}

export async function submitGuessWhoVote(
  gameId: string,
  userId: string,
  selectedMentorId: string,
  isCorrect: boolean
) {
  try {
    await addDoc(collection(db, "guessWhoGames", gameId, "votes"), {
      userId,
      selectedMentorId,
      isCorrect,
      createdAt: serverTimestamp(),
    });

  } catch (error) {
    handleGamificationError(error, `submitGuessWhoVote(${gameId})`);
  }
}

export async function hasUserVotedOnGame(
  gameId: string,
  userId: string
): Promise<boolean> {
  try {
    const votesQuery = query(
      collection(db, "guessWhoGames", gameId, "votes"),
      where("userId", "==", userId),
      limit(1)
    );
    const snapshot = await getDocs(votesQuery);
    return !snapshot.empty;
  } catch (error) {
    handleGamificationError(error, `hasUserVotedOnGame(${gameId})`);
    return false;
  }
}

export function subscribeToGuessWhoScores(
  callback: (scores: DetectiveScore[]) => void
) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("xp", "desc"), limit(10));

  return onSnapshot(
    q,
    (snapshot) => {
      const scores: DetectiveScore[] = snapshot.docs.map((d, idx) => ({
        userId: d.id,
        name: (d.data().name as string) || "Anonyme",
        xp: (d.data().xp as number) || 0,
        rank: idx + 1,
      }));
      callback(scores);
    },
    (error) => handleGamificationError(error, "subscribeToGuessWhoScores")
  );
}

export async function awardGuessWhoXp(
  userId: string,
  xpAmount: number
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      xp: increment(xpAmount),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleGamificationError(error, `awardGuessWhoXp(${userId})`);
  }
}

export function subscribeToBadges(callback: (badges: BadgeItem[]) => void) {
  const badgesQuery = query(collection(db, "badges"), orderBy("name", "asc"));

  return onSnapshot(
    badgesQuery,
    (snapshot) => {
      const badges = snapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })) as BadgeItem[];
      callback(badges);
    },
    (error) => handleGamificationError(error, "subscribeToBadges")
  );
}

export function subscribeToMilestones(
  callback: (milestones: MilestoneItem[]) => void
) {
  return onSnapshot(
    collection(db, "milestones"),
    (snapshot) => {
      const milestones = snapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })) as MilestoneItem[];
      callback(milestones);
    },
    (error) => handleGamificationError(error, "subscribeToMilestones")
  );
}

export async function createBadge(badge: Omit<BadgeItem, "id">) {
  return addDoc(collection(db, "badges"), badge);
}

export async function createMilestone(milestone: Omit<MilestoneItem, "id">) {
  return addDoc(collection(db, "milestones"), milestone);
}
