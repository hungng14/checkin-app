"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ReactionOption {
  type: string;
  emoji: string;
  label: string;
}

const reactionOptions: ReactionOption[] = [
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "heart", emoji: "❤️", label: "Heart" },
  { type: "wow", emoji: "😮", label: "Wow" },
];

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (reactionType: string) => void;
  onClose: () => void;
  currentReaction?: string[] | string | null;
}

export default function ReactionPicker({
  isOpen,
  onSelect,
  onClose,
  currentReaction
}: ReactionPickerProps) {
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const handleSelect = (reactionType: string) => {
    onSelect(reactionType);
    onClose();
  };

  // Normalize currentReaction to array for easier checking
  const currentReactions = Array.isArray(currentReaction)
    ? currentReaction
    : currentReaction
      ? [currentReaction]
      : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Reaction picker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              duration: 0.2 
            }}
            className="absolute bottom-full left-0 mb-2 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-full shadow-lg px-2 py-1"
          >
            <div className="flex items-center gap-1">
              {reactionOptions.map((option, index) => (
                <motion.button
                  key={option.type}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                  whileHover={{ 
                    scale: 1.3,
                    y: -2,
                    transition: { duration: 0.15 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(option.type)}
                  onMouseEnter={() => setHoveredReaction(option.type)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  className={` cursor-pointer
                    relative flex items-center justify-center w-10 h-10 rounded-full
                    transition-all duration-200 ease-out
                    hover:bg-slate-100/80 dark:hover:bg-slate-700/80
                    ${currentReactions.includes(option.type)
                      ? 'bg-blue-100/80 dark:bg-blue-900/30 ring-2 ring-blue-500/50'
                      : ''
                    }
                  `}
                >
                  <span className="text-xl select-none">
                    {option.emoji}
                  </span>
                  
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredReaction === option.type && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none"
                      >
                        {option.label}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export the reaction options for use in other components
export { reactionOptions };
