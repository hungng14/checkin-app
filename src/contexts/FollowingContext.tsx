"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface FollowingContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const FollowingContext = createContext<FollowingContextType | undefined>(undefined);

export function FollowingProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <FollowingContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </FollowingContext.Provider>
  );
}

export function useFollowing() {
  const context = useContext(FollowingContext);
  if (context === undefined) {
    throw new Error("useFollowing must be used within a FollowingProvider");
  }
  return context;
}
