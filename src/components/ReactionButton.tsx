'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactionPicker, { reactionOptions } from './ReactionPicker';

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
  className = '',
}: ReactionButtonProps) {
  const [reactions, setReactions] = useState<ReactionData[]>(initialReactions);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch reactions data (only when needed, e.g., after user interaction)
  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/reactions?checkinId=${checkinId}`);
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  // Initialize with provided data, only fetch if no initial data provided
  useEffect(() => {
    if (initialReactions.length === 0 && initialUserReactions.length === 0) {
      fetchReactions();
    }
  }, [checkinId]);

  const handleReactionSelect = async (reactionType: string) => {
    // Prevent double execution during React StrictMode in development
    if (isProcessing) {
      console.log('Already processing reaction, skipping...');
      return;
    }

    setIsProcessing(true);

    const isAlreadyReacted = !!reactions.find((r) => r.type === reactionType)
      ?.userReacted;

    const updatedReactions = JSON.parse(
      JSON.stringify(reactions, null, 2)
    ) as ReactionData[];

    if (isAlreadyReacted) {
      // Remove user's reaction optimistically
      const existingIndex = updatedReactions.findIndex(
        (r) => r.type === reactionType
      );

      if (existingIndex !== -1) {
        // Decrease count by 1 since user is removing their reaction
        const newCount = updatedReactions[existingIndex].count - 1;

        updatedReactions[existingIndex].count = newCount < 0 ? 0 : newCount;

        updatedReactions[existingIndex].userReacted = false;
        // Don't remove the reaction from the list - keep it visible with updated count
        // This way users can see all available reactions even if count becomes 0
      }
      setReactions(updatedReactions);
    } else {
      // Add user's reaction optimistically
      const existingIndex = updatedReactions.findIndex(
        (r) => r.type === reactionType
      );
      if (existingIndex !== -1) {
        // Increase count by 1 since user is adding their reaction
        const newCount = updatedReactions[existingIndex].count + 1;
        updatedReactions[existingIndex].count = newCount < 0 ? 0 : newCount;
        updatedReactions[existingIndex].userReacted = true;
      } else {
        // Create new reaction entry with count 1
        updatedReactions.push({
          type: reactionType,
          count: 1,
          userReacted: true, // This field is not used anymore, we use userReactions array
        });
      }

      setReactions(updatedReactions);
    }

    // Sync with API in background (non-blocking)
    syncReactionWithAPI(reactionType, isAlreadyReacted);

    // Reset processing flag after a short delay to allow for UI updates
    setTimeout(() => setIsProcessing(false), 1000);
  };

  // Separate async function for API sync - runs in background
  const syncReactionWithAPI = async (
    reactionType: string,
    wasAlreadyReacted: boolean
  ) => {
    try {
      if (wasAlreadyReacted) {
        // Remove reaction from server
        await fetch(
          `/api/reactions?checkinId=${checkinId}&reactionType=${reactionType}`,
          {
            method: 'DELETE',
          }
        );

        // if (!response.ok) {
        //   // Revert optimistic update on failure - add user reaction back
        //   setUserReactions((prev) => [...prev, reactionType]);
        //   setReactions((prev) => {
        //     const updated = [...prev];
        //     const existingIndex = updated.findIndex(
        //       (r) => r.type === reactionType
        //     );
        //     if (existingIndex !== -1) {
        //       // Add count back since removal failed
        //       updated[existingIndex].count += 1;
        //     } else {
        //       // Recreate the reaction entry
        //       updated.push({
        //         type: reactionType,
        //         count: 1,
        //         userReacted: false,
        //       });
        //     }
        //     return updated;
        //   });
        //   toast.error('Failed to remove reaction - reverted');
        // }
      } else {
        // Add reaction to server
        await fetch('/api/reactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkinId,
            reactionType,
          }),
        });

        // if (!response.ok) {
        //   // Revert optimistic update on failure - remove user reaction
        //   setUserReactions((prev) => prev.filter((r) => r !== reactionType));
        //   setReactions((prev) => {
        //     const updated = [...prev];
        //     const existingIndex = updated.findIndex(
        //       (r) => r.type === reactionType
        //     );
        //     if (existingIndex !== -1) {
        //       // Decrease count back since addition failed
        //       updated[existingIndex].count = Math.max(0, updated[existingIndex].count - 1);
        //       // Keep the reaction visible even if count becomes 0
        //     }
        //     return updated;
        //   });
        //   toast.error('Failed to add reaction - reverted');
        // }
      }
    } catch (error) {
      console.error('Failed to sync reaction:', error);
      // Revert optimistic update on network error
      // if (wasAlreadyReacted) {
      //   // Revert removal - add user reaction back
      //   setUserReactions((prev) => [...prev, reactionType]);
      //   setReactions((prev) => {
      //     const updated = [...prev];
      //     const existingIndex = updated.findIndex((r) => r.type === reactionType);
      //     if (existingIndex !== -1) {
      //       updated[existingIndex].count += 1;
      //     } else {
      //       updated.push({
      //         type: reactionType,
      //         count: 1,
      //         userReacted: false,
      //       });
      //     }
      //     return updated;
      //   });
      // } else {
      //   // Revert addition - remove user reaction
      //   setUserReactions((prev) => prev.filter((r) => r !== reactionType));
      //   setReactions((prev) => {
      //     const updated = [...prev];
      //     const existingIndex = updated.findIndex((r) => r.type === reactionType);
      //     if (existingIndex !== -1) {
      //       updated[existingIndex].count = Math.max(0, updated[existingIndex].count - 1);
      //       // Keep reaction visible even if count becomes 0
      //     }
      //     return updated;
      //   });
      // }
      toast.error('Network error - reaction reverted');
    } finally {
    }
  };

  const outputReactions = useMemo(() => {
    return reactions.filter(r => r.count > 0)
  }, [reactions]);

  return (
    <div className={`relative ${className}`}>
      {/* Show all available reactions with counts */}
      <div className='flex items-center gap-1'>
        {/* Show all reaction types that have been used, or all available types if none have been used */}
        {outputReactions.map((reactionData) => {
          const reactionOption = reactionOptions.find(
            (r) => r.type === reactionData.type
          );
          const userHasReacted = reactions.find(
            (r) => r.type === reactionData.type
          )?.userReacted;

          // Show all reactions that exist in the reactions array (they've been used at least once)
          // This ensures reactions don't disappear when count goes to 0

          return (
            <motion.div
              key={reactionData.type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleReactionSelect(reactionData.type)}
                className={`
                    h-8 px-2 rounded-full transition-all duration-200 cursor-pointer
                    ${
                      userHasReacted
                        ? 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }
                  `}
              >
                <motion.div
                  className='flex items-center gap-1'
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                    className='text-sm'
                  >
                    {reactionOption?.emoji}
                  </motion.span>

                  <AnimatePresence mode='wait'>
                    <motion.span
                      key={reactionData.count}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className='text-xs font-medium'
                    >
                      {reactionData.count}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              </Button>
            </motion.div>
          );
        })}

        {/* Add reaction button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className=' p-1 h-7 w-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex gap-1'
          >
            <SmilePlus className='h-6 w-6' />
          </Button>
        </motion.div>
      </div>

      <ReactionPicker
        isOpen={isPickerOpen}
        onSelect={handleReactionSelect}
        onClose={() => setIsPickerOpen(false)}
        currentReaction={reactions
          .filter((r) => r.userReacted)
          .map((r) => r.type)}
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
