"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useFollowing } from "@/contexts/FollowingContext";

interface User {
  id: string;
  username: string;
  displayName: string;
  followedAt: string;
}

interface FollowingListProps {
  type?: "following" | "followers";
  userId?: string;
  title?: string;
}

export default function FollowingList({
  type = "following",
  userId,
  title
}: FollowingListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());
  const { refreshTrigger } = useFollowing();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (userId) params.append("userId", userId);
      
      const response = await fetch(`/api/follows?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        toast.error(data.error || "Failed to load users");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [type, userId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const handleUnfollow = async (followingId: string) => {
    setUnfollowingIds(prev => new Set(prev).add(followingId));

    try {
      const response = await fetch(`/api/follows?followingId=${followingId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== followingId));
        toast.success("User unfollowed successfully!");
      } else {
        toast.error(data.error || "Failed to unfollow user");
      }
    } catch (error) {
      console.error("Unfollow error:", error);
      toast.error("Failed to unfollow user");
    } finally {
      setUnfollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(followingId);
        return newSet;
      });
    }
  };

  const displayTitle = title || (type === "following" ? "Following" : "Followers");

  return (
    <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {displayTitle}
          {!isLoading && <span className="text-sm font-normal text-slate-600 dark:text-slate-400">({users.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {isLoading ? (
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
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-800 dark:text-slate-100">{user.displayName}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">@{user.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {type === "following" ? "Following since" : "Follower since"} {new Date(user.followedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {type === "following" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnfollow(user.id)}
                      disabled={unfollowingIds.has(user.id)}
                      className="ml-4 rounded-full bg-white/80 hover:bg-red-50 dark:bg-slate-600/50 dark:hover:bg-red-900/20 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                    >
                      {unfollowingIds.has(user.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-slate-500 dark:text-slate-400"
            >
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>
                {type === "following"
                  ? "Not following anyone yet"
                  : "No followers yet"
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
