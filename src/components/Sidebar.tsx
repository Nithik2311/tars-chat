"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Search, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Id } from "../../convex/_generated/dataModel";

// --- STEP 4: Sidebar & User List UI ---
export function Sidebar({ 
  onSelectChat,
  className
}: { 
  onSelectChat: (convId: Id<"conversations">, user: any) => void;
  className?: string;
}) {
  const users = useQuery(api.users.getUsers);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(Date.now());

  // Re-evaluate online status every 10 seconds on the client
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = async (user: any) => {
    const convId = await getOrCreateConversation({ otherUserId: user.clerkId });
    onSelectChat(convId, user);
  };

  return (
    <div className={`w-full md:w-80 h-full border-r bg-zinc-50 flex-col ${className || "flex"}`}>
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <h2 className="text-xl font-bold">Chats</h2>
        <UserButton />
      </div>

      <div className="p-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search users..."
            className="pl-9 bg-zinc-50 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {users === undefined ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-sm">Loading users...</p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
              <p className="text-sm">
                {searchQuery ? "No users found." : "No other users registered yet."}
              </p>
            </div>
          ) : (
            filteredUsers?.map((user) => {
              const isOnline =
                user.isOnline && now - user.lastSeen < 60000; // 60s threshold
              return (
              <div
                key={user._id}
                onClick={() => handleUserClick(user)}
                className="flex items-center gap-3 p-3 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={user.imageUrl} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">{user.name}</h3>
                    {user.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                  {user.lastMessage ? (
                    <p className={`text-sm truncate ${user.unreadCount > 0 ? "text-zinc-800 font-medium" : "text-zinc-500"}`}>
                      {user.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic truncate">Start a conversation</p>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
// --- END STEP 4 ---
