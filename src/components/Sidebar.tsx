"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Id } from "../../convex/_generated/dataModel";

export function Sidebar({ onSelectChat }: { onSelectChat: (convId: Id<"conversations">, user: any) => void }) {
  const users = useQuery(api.users.getUsers);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = async (user: any) => {
    const convId = await getOrCreateConversation({ otherUserId: user.clerkId });
    onSelectChat(convId, user);
  };

  return (
    <div className="w-full md:w-80 h-full border-r bg-zinc-50 flex flex-col">
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
            <p className="text-sm text-zinc-500 text-center mt-4">Loading users...</p>
          ) : filteredUsers?.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center mt-4">
              {searchQuery ? "No users found." : "No other users registered yet."}
            </p>
          ) : (
            filteredUsers?.map((user) => (
              <div
                key={user._id}
                onClick={() => handleUserClick(user)}
                className="flex items-center gap-3 p-3 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors"
              >
                <Avatar>
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-medium truncate">{user.name}</h3>
                  {user.lastMessage ? (
                    <p className="text-sm text-zinc-500 truncate">{user.lastMessage.content}</p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic truncate">Start a conversation</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
