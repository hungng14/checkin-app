"use client";

import { useState, useEffect } from "react";
import { Copy, User, Check, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UsernameDisplay() {
  const [username, setUsername] = useState<string>("");
  const [editingUsername, setEditingUsername] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch user's profile to get username
          const response = await fetch('/api/profile');
          const data = await response.json();
          
          if (response.ok && data.profile?.username) {
            setUsername(data.profile.username);
            setEditingUsername(data.profile.username);
          }
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsername();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      toast.success("Username copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSave = async () => {
    if (!editingUsername.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    if (editingUsername === username) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editingUsername.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsername(editingUsername.trim());
        setIsEditing(false);
        toast.success("Username updated successfully!");
      } else {
        toast.error(data.error || "Failed to update username");
      }
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error("Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingUsername(username);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
          <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Your Username
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Others can find and follow you using this username
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">@</span>
                <Input
                  value={editingUsername}
                  onChange={(e) => setEditingUsername(e.target.value)}
                  className="flex-1 bg-slate-50/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                  placeholder="Enter username"
                  disabled={saving}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 rounded-full bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="shrink-0 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 p-3 bg-slate-50/80 dark:bg-slate-700/50 rounded-lg font-mono text-sm break-all text-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-slate-600/50">
                @{username}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0 rounded-full bg-white/80 hover:bg-blue-50 dark:bg-slate-600/50 dark:hover:bg-blue-900/20 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="shrink-0 rounded-full bg-white/80 hover:bg-purple-50 dark:bg-slate-600/50 dark:hover:bg-purple-900/20 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
