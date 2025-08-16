"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactionPicker, { reactionOptions } from "./ReactionPicker";

interface ReactionData {
  type: string;
  count: number;
  userReacted: boolean;
}

interface ReactionButtonProps {
  checkinId: string;
  initialReactions?: ReactionData[];
  initialUserReactions?: string[];
  className?: string;
}

export default function ReactionButton({
  checkinId,
  initialReactions = [],
  initialUserReactions = [],
  className = ""
}: ReactionButtonProps) {
  const [reactions, setReactions] = useState<ReactionData[]>(initialReactions);
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch reactions data (only when needed, e.g., after user interaction)
  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/reactions?checkinId=${checkinId}`);
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || []);
        setUserReactions(data.userReactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch reactions:", error);
    }
  };

  // Initialize with provided data, only fetch if no initial data provided
  useEffect(() => {
    if (initialReactions.length === 0 && initialUserReactions.length === 0) {
      fetchReactions();
    }
  }, [checkinId]);

  const handleReactionSelect = async (reactionType: string) => {
    if (pendingActions.has(reactionType)) return;

    const isAlreadyReacted = userReactions.includes(reactionType);

    // Optimistic update - update UI immediately
    if (isAlreadyReacted) {
      // Remove reaction optimistically
      setUserReactions(prev => prev.filter(r => r !== reactionType));
      setReactions(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(r => r.type === reactionType);
        if (existingIndex !== -1) {
          updated[existingIndex].count = Math.max(0, updated[existingIndex].count - 1);
          updated[existingIndex].userReacted = updated[existingIndex].count > 0;
          if (updated[existingIndex].count === 0) {
            updated.splice(existingIndex, 1);
          }
        }
        return updated;
      });
    } else {
      // Add reaction optimistically
      setUserReactions(prev => [...prev, reactionType]);
      setReactions(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(r => r.type === reactionType);
        if (existingIndex !== -1) {
          updated[existingIndex].count += 1;
          updated[existingIndex].userReacted = true;
        } else {
          updated.push({
            type: reactionType,
            count: 1,
            userReacted: true
          });
        }
        return updated;
      });
    }

    // Add to pending actions
    setPendingActions(prev => new Set(prev).add(reactionType));

    // Show immediate feedback
    // toast.success(
    //   <div className="flex items-center gap-2">
    //     <motion.span
    //       initial={{ scale: 0 }}
    //       animate={{ scale: [0, 1.2, 1] }}
    //       transition={{ duration: 0.3 }}
    //     >
    //       {reactionOption?.emoji}
    //     </motion.span>
    //     <span>{isAlreadyReacted ? 'Removed' : 'Added'} {reactionOption?.label}!</span>
    //   </div>
    // );

    // Sync with API in background
    try {
      if (isAlreadyReacted) {
        // Remove reaction
        const response = await fetch(`/api/reactions?checkinId=${checkinId}&reactionType=${reactionType}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setUserReactions(prev => [...prev, reactionType]);
          setReactions(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(r => r.type === reactionType);
            if (existingIndex !== -1) {
              updated[existingIndex].count += 1;
              updated[existingIndex].userReacted = true;
            } else {
              updated.push({
                type: reactionType,
                count: 1,
                userReacted: true
              });
            }
            return updated;
          });
          toast.error("Failed to remove reaction");
        } else {
          // Fetch fresh data after successful removal
          fetchReactions();
        }
      } else {
        // Add reaction
        const response = await fetch("/api/reactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkinId,
            reactionType,
          }),
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setUserReactions(prev => prev.filter(r => r !== reactionType));
          setReactions(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(r => r.type === reactionType);
            if (existingIndex !== -1) {
              updated[existingIndex].count = Math.max(0, updated[existingIndex].count - 1);
              updated[existingIndex].userReacted = updated[existingIndex].count > 0;
              if (updated[existingIndex].count === 0) {
                updated.splice(existingIndex, 1);
              }
            }
            return updated;
          });
          toast.error("Failed to add reaction");
        } else {
          // Fetch fresh data after successful addition
          fetchReactions();
        }
      }
    } catch (error) {
      console.error("Failed to sync reaction:", error);
      // Revert optimistic update on error
      if (isAlreadyReacted) {
        setUserReactions(prev => [...prev, reactionType]);
      } else {
        setUserReactions(prev => prev.filter(r => r !== reactionType));
      }
      toast.error("Failed to sync reaction");
    } finally {
      // Remove from pending actions
      setPendingActions(prev => {
        const updated = new Set(prev);
        updated.delete(reactionType);
        return updated;
      });
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className={`relative ${className}`}>
      {/* Show user's reactions as individual buttons */}
      <div className="flex items-center gap-1">
        {userReactions.length > 0 ? (
          // Show user's active reactions
          userReactions.map((reactionType) => {
            const reactionOption = reactionOptions.find(r => r.type === reactionType);
            const reactionData = reactions.find(r => r.type === reactionType);
            const isPending = pendingActions.has(reactionType);

            return (
              <motion.div
                key={reactionType}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.1 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReactionSelect(reactionType)}
                  disabled={isPending}
                  className={`
                    h-8 px-2 rounded-full transition-all duration-200
                    bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50 cursor-pointer
                    text-pink-600 dark:text-pink-400
                    ${isPending ? 'opacity-50' : ''}
                  `}
                >
                  <motion.div
                    className="flex items-center gap-1"
                    animate={{
                      scale: isPending ? 0.95 : 1,
                      opacity: isPending ? 0.7 : 1
                    }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25
                      }}
                      className="text-sm"
                    >
                      {reactionOption?.emoji}
                    </motion.span>

                    <AnimatePresence mode="wait">
                      <motion.span
                        key={reactionData?.count || 0}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs"
                      >
                        {reactionData?.count || 0}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                </Button>
              </motion.div>
            );
          })
        ) : (
          // Show default reaction button when user has no reactions
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            <Button
              ref={buttonRef}
              variant="ghost"
              size="sm"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="cursor-pointer h-8 px-2 rounded-full transition-all duration-200 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400"
            >
              <motion.div
                className="flex items-center gap-1"
                transition={{ duration: 0.1 }}
              >
                <motion.div
                  animate={{
                    scale: isPickerOpen ? 1.1 : 1,
                    rotate: isPickerOpen ? 15 : 0
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Heart className="h-4 w-4" />
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.span
                    key={totalReactions}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs"
                  >
                    {totalReactions > 0 ? totalReactions : "React"}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </Button>
          </motion.div>
        )}

        {/* Add reaction button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        >
          <SmilePlus className="h-3 w-3" />
        </Button>
      </div>

      <ReactionPicker
        isOpen={isPickerOpen}
        onSelect={handleReactionSelect}
        onClose={() => setIsPickerOpen(false)}
        currentReaction={userReactions}
      />

      {/* Reaction summary */}
      {/* <AnimatePresence>
        {reactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
          >
            {reactions.slice(0, 3).map((reaction, index) => {
              const option = reactionOptions.find(r => r.type === reaction.type);
              return (
                <motion.div
                  key={reaction.type}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center gap-0.5 cursor-default"
                >
                  <motion.span
                    animate={{
                      scale: reaction.userReacted ? [1, 1.2, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {option?.emoji}
                  </motion.span>
                  <motion.span
                    key={reaction.count}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {reaction.count}
                  </motion.span>
                </motion.div>
              );
            })}
            {reactions.length > 3 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-500"
              >
                +{reactions.length - 3}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
}
