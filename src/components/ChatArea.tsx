"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { useUser } from "@clerk/nextjs";
import { format, isToday, isSameYear } from "date-fns";

function formatMessageTime(date: number) {
  const d = new Date(date);
  if (isToday(d)) {
    return format(d, "h:mm a"); // 2:34 PM
  }
  if (isSameYear(d, new Date())) {
    return format(d, "MMM d, h:mm a"); // Feb 15, 2:34 PM
  }
  return format(d, "MMM d, yyyy, h:mm a"); // Feb 15, 2025, 2:34 PM
}

export function ChatArea({ 
  conversationId, 
  otherUser 
}: { 
  conversationId: Id<"conversations"> | null;
  otherUser: any | null;
}) {
  const { user: currentUser } = useUser();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const messages = useQuery(
    api.messages.list, 
    conversationId ? { conversationId } : "skip"
  );
  
  const sendMessage = useMutation(api.messages.send);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear
    await sendMessage({ conversationId, content });
  };

  if (!conversationId || !otherUser) {
    return (
      <div className="flex-1 h-full flex flex-col bg-white hidden md:flex">
        <div className="p-4 border-b flex items-center bg-white h-[73px]">
          <h2 className="text-xl font-bold text-zinc-300">Select a chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-zinc-50">
          <p className="text-zinc-500">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-white h-[73px]">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.imageUrl} />
          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-bold">{otherUser.name}</h2>
          <p className="text-xs text-zinc-500">Click to view profile</p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-zinc-50 min-h-0">
        <div className="flex flex-col gap-4 p-4 min-h-full">
          {messages === undefined ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-zinc-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full mt-20">
              <div className="bg-white p-6 rounded-full shadow-sm border mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={otherUser.imageUrl} />
                  <AvatarFallback className="text-2xl">{otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-xl font-semibold text-zinc-800">Say hi to {otherUser.name}!</h3>
              <p className="text-zinc-500 mt-2 text-center max-w-sm">
                This is the beginning of your conversation. Send a message to start chatting.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1" /> {/* Spacer to push messages to bottom if few */}
              {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                    <div 
                      className={`rounded-2xl px-4 py-2 ${
                        isMe 
                          ? "bg-blue-600 text-white rounded-br-sm" 
                          : "bg-white border text-zinc-900 rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 px-1">
                      {formatMessageTime(msg._creationTime)}
                    </span>
                  </div>
                </div>
              );
            })}
            </>
          )}
          {messages && messages.length > 0 && <div ref={scrollRef} />}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
