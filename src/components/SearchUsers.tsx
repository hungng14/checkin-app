"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useFollowing } from "@/contexts/FollowingContext";
// Simple debounce implementation for search function
function debounceSearch(func: (query: string) => Promise<void>, wait: number) {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (query: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(query), wait);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

interface User {
  id: string;
  username: string;
  displayName: string;
}

interface UserWithFollowStatus extends User {
  isFollowing?: boolean;
  isLoading?: boolean;
}

export default function SearchUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithFollowStatus[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { triggerRefresh } = useFollowing();

  // Debounced search function
  const debouncedSearch = useCallback(() => {
    return debounceSearch(async (query: string) => {
      if (query.length < 2) {
        setUsers([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/users/search?username=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
          // Get follow status for each user
          const usersWithStatus = await Promise.all(
            data.users.map(async (user: User) => {
              try {
                const statusResponse = await fetch(`/api/follows/status?userId=${user.id}`);
                const statusData = await statusResponse.json();
                return {
                  ...user,
                  isFollowing: statusData.isFollowing || false,
                  isLoading: false,
                };
              } catch {
                return { ...user, isFollowing: false, isLoading: false };
              }
            })
          );
          setUsers(usersWithStatus);
        } else {
          toast.error(data.error || "Search failed");
          setUsers([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Search failed");
        setUsers([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 500);
  }, []);

  useEffect(() => {
    const search = debouncedSearch();
    search(searchQuery);
    return () => {
      search.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const handleFollow = async (userId: string) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId ? { ...user, isLoading: true } : user
      )
    );

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId
              ? { ...user, isFollowing: true, isLoading: false }
              : user
          )
        );
        toast.success("User followed successfully!");
        // Trigger refresh of the following list
        triggerRefresh();
      } else {
        toast.error(data.error || "Failed to follow user");
        setUsers(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, isLoading: false } : user
          )
        );
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to follow user");
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isLoading: false } : user
        )
      );
    }
  };

  const handleUnfollow = async (userId: string) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId ? { ...user, isLoading: true } : user
      )
    );

    try {
      const response = await fetch(`/api/follows?followingId=${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: false, isLoading: false }
              : user
          )
        );
        toast.success("User unfollowed successfully!");
      } else {
        toast.error(data.error || "Failed to unfollow user");
        setUsers(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, isLoading: false } : user
          )
        );
      }
    } catch (error) {
      console.error("Unfollow error:", error);
      toast.error("Failed to unfollow user");
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isLoading: false } : user
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        <Input
          type="text"
          placeholder="Search users by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-50/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500 dark:text-slate-400" />
        )}
      </div>

      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
          </motion.div>
        ) : users.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden bg-slate-50/80 dark:bg-slate-700/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/70 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 dark:text-slate-100">{user.displayName}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={user.isFollowing ? "outline" : "default"}
                        onClick={() => user.isFollowing ? handleUnfollow(user.id) : handleFollow(user.id)}
                        disabled={user.isLoading}
                        className={`ml-4 rounded-full ${
                          user.isFollowing
                            ? "bg-white/80 hover:bg-red-50 dark:bg-slate-600/50 dark:hover:bg-red-900/20 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                            : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                        }`}
                      >
                        {user.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : hasSearched && searchQuery.length >= 2 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 text-slate-500 dark:text-slate-400"
          >
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No users found for &quot;{searchQuery}&quot;</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
