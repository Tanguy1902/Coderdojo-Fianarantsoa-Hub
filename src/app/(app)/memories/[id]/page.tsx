"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { MOCK_MEMORIES, MOCK_MENTORS } from "@/lib/mockData";
import { MemoryItem } from "@/types";
import {
  subscribeToMemory,
  toggleLikeMemory,
  addCommentToMemory,
} from "@/lib/firebase/memories";
import { MemoryComments } from "@/components/memories/MemoryCard";
import { ReactionPicker } from "@/components/common/ReactionPicker";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  MessageCircle,
  Send,
  Share2,
  User,
  Check,
} from "lucide-react";
import { ImageLightboxModal } from "@/components/memories/ImageLightboxModal";

export default function MemoryDetailPage() {
  const params = useParams();
  const memoryId = params.id as string;
  const { user } = useAuth();

  const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const mockFallback = !isFirebaseConfigured
    ? MOCK_MEMORIES.find((m) => m.id === memoryId) || null
    : null;

  const [memory, setMemory] = useState<MemoryItem | null>(mockFallback);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!memoryId || !isFirebaseConfigured) return;

    const unsubscribe = subscribeToMemory(memoryId, (data) => {
      if (data) {
        setMemory(data);
      } else {
        // Fallback to mock data if doc doesn't exist in Firestore
        const mockMatch = MOCK_MEMORIES.find((m) => m.id === memoryId);
        setMemory(mockMatch || null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [memoryId, isFirebaseConfigured]);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="font-headline font-bold text-sm text-on-surface">
          Chargement du souvenir...
        </span>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4 font-body">
        <span className="text-5xl">📷</span>
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Souvenir introuvable
        </h1>
        <p className="text-sm text-on-surface-variant max-w-md">
          Le souvenir que vous cherchez n&apos;existe pas ou a été supprimé.
        </p>
        <Link
          href="/memories"
          className="bg-primary text-on-primary font-mono text-xs font-bold px-6 py-3 rounded-full flex items-center gap-2 hover:bg-surface-tint transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux souvenirs
        </Link>
      </div>
    );
  }

  const allPhotos = memory.images && memory.images.length > 0 ? memory.images : [memory.imageUrl];
  const currentPhoto = allPhotos[activeImageIndex] || memory.imageUrl;

  const handlePrevPhoto = () => {
    setActiveImageIndex((prev) => (prev === 0 ? allPhotos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setActiveImageIndex((prev) => (prev === allPhotos.length - 1 ? 0 : prev + 1));
  };

  const handleLike = async (emoji: string = "❤️") => {
    if (!user) return;

    const hasReacted = memory.reactions?.[emoji]?.includes(user.id);
    setMemory((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        likesCount: hasReacted ? Math.max(0, prev.likesCount - 1) : prev.likesCount + 1,
        reactions: {
          ...(prev.reactions || {}),
          [emoji]: hasReacted
            ? (prev.reactions?.[emoji] || []).filter((id) => id !== user.id)
            : [...(prev.reactions?.[emoji] || []), user.id],
        },
      };
    });

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      try {
        await toggleLikeMemory(memory.id, user.id, emoji);
      } catch (err) {
        console.warn("Firestore memory like sync error:", err);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await addCommentToMemory(memory.id, {
        postId: memory.id,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar,
        content: commentInput,
      });
    } else {
      setMemory((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null));
    }
    setCommentInput("");
  };

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: memory.title,
          text: memory.description,
          url: window.location.href,
        });
        return;
      } catch (e) {
        console.warn("Share cancelled", e);
      }
    }
    if (typeof window !== "undefined") {
      await navigator.clipboard.writeText(window.location.href);
      setShareNotice("Lien du souvenir copié !");
      setTimeout(() => setShareNotice(null), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/memories"
          className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/30"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste des souvenirs
        </Link>

        {shareNotice && (
          <div className="p-2.5 bg-primary-container/20 text-primary font-mono text-xs rounded-full flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            {shareNotice}
          </div>
        )}
      </div>

      {/* Main Memory Details Card */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 card-shadow border border-outline-variant/30 flex flex-col gap-6">
        {/* Title & Metadata */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="bg-primary-container/20 text-primary font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {memory.eventDate}
            </span>
            <span className="font-mono text-xs text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
              {allPhotos.length} photo{allPhotos.length > 1 ? "s" : ""} dans cette galerie
            </span>
          </div>

          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface">
            {memory.title}
          </h1>

          {/* Author info */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-outline-variant/20">
            <Image
              src={memory.authorAvatar || MOCK_MENTORS[0].avatar}
              alt={memory.authorName}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <span className="font-headline font-bold text-on-surface block text-sm">
                {memory.authorName}
              </span>
              <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {memory.authorRole || "Mentor CoderDojo"}
              </span>
            </div>
          </div>
        </div>

        {/* Gallery Viewer Hero Box */}
        <div className="flex flex-col gap-4">
          <div className="relative h-72 sm:h-96 md:h-[480px] w-full rounded-2xl overflow-hidden bg-black/90 group shadow-lg">
            <Image
              src={currentPhoto}
              alt={`${memory.title} - Photo ${activeImageIndex + 1}`}
              fill
              sizes="(min-width: 1024px) 80vw, 100vw"
              className="object-contain"
              priority
            />

            {/* Lightbox Trigger Button */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-md transition-all shadow-md"
              title="Agrandir la photo (Plein écran)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Navigation Overlay Buttons (Only if multiple photos) */}
            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Photo Counter Badge */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white font-mono text-xs px-3 py-1 rounded-full">
              Photo {activeImageIndex + 1} / {allPhotos.length}
            </div>
          </div>

          {/* Thumbnail Strip Grid */}
          {allPhotos.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pt-2">
              {allPhotos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    idx === activeImageIndex
                      ? "border-primary scale-105 shadow-md ring-2 ring-primary/30"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={url} alt={`Miniature ${idx + 1}`} fill sizes="100px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="pt-2">
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">
            À propos de ce souvenir
          </h3>
          <p className="font-body text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
            {memory.description}
          </p>
        </div>

        {/* Active Reactions Pills */}
        {memory.reactions && Object.keys(memory.reactions).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {Object.entries(memory.reactions).map(([emoji, userIds]) => {
              if (!userIds || userIds.length === 0) return null;
              const hasReacted = Boolean(user && userIds.includes(user.id));
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleLike(emoji)}
                  className={`px-3 py-1 rounded-full font-mono text-xs flex items-center gap-1.5 border transition-all ${
                    hasReacted
                      ? "bg-primary-container/20 border-primary text-primary font-bold shadow-xs"
                      : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/40"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Actions Bar */}
        <div className="relative flex items-center justify-between pt-4 border-t border-outline-variant/20 font-mono text-sm">
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleLike("❤️")}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold cursor-pointer"
            >
              <Heart className="w-5 h-5 text-red-500 fill-red-500/20" />
              <span>{memory.likesCount} J&apos;aime</span>
            </button>

            <span className="flex items-center gap-2 text-on-surface-variant">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span>{memory.commentsCount} Commentaires</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ReactionPicker
              onSelectEmoji={(emoji) => handleLike(emoji)}
              label="😀+ Réagir"
            />

            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
              <span>Partager</span>
            </button>
          </div>
        </div>

        {/* Comments Thread Section */}
        <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">
            Commentaires ({memory.commentsCount})
          </h3>

          {process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
            <MemoryComments memoryId={memory.id} />
          )}

          <form onSubmit={handleCommentSubmit} className="flex gap-3 mt-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Ajouter un commentaire sur cette galerie..."
              className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-full px-5 py-3 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-surface-tint text-on-primary font-mono text-xs font-bold px-6 py-3 rounded-full flex items-center gap-2 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        </div>
      </div>

      <ImageLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={allPhotos}
        activeIndex={activeImageIndex}
        onIndexChange={setActiveImageIndex}
        title={memory.title}
      />
    </div>
  );
}
