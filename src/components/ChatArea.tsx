"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, ArrowLeft, ArrowDown, Trash2, Trash, MoreVertical, SmilePlus, Loader2, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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

// --- STEP 6: Chat Area Layout & State ---
export function ChatArea({ 
  conversationId, 
  otherUser,
  className,
  onBack
}: { 
  conversationId: Id<"conversations"> | null;
  otherUser: any | null;
  className?: string;
  onBack?: () => void;
}) {
  const { user: currentUser } = useUser();
  const [newMessage, setNewMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [now, setNow] = useState(Date.now());
  
  // --- STEP 12: Loading & Error States (Optimistic UI) ---
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsentMessage, setUnsentMessage] = useState<string | null>(null);
  // --- END STEP 12 ---

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const lastConversationId = useRef<Id<"conversations"> | null>(null);
  
  // Keep a live view of the other user's data (online status, avatar, etc.)
  const users = useQuery(api.users.getUsers);
  const liveOtherUser =
    users?.find((u) => u.clerkId === otherUser?.clerkId) || otherUser;

  // --- STEP 7: Sending & Fetching Messages ---
  const messages = useQuery(
    api.messages.list, 
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  // --- END STEP 7 ---

  // --- STEP 9: Read Receipts ---
  const markAsRead = useMutation(api.messages.markAsRead);
  // --- END STEP 9 ---

  // --- STEP 11: Message Deletion (Soft Delete) ---
  const deleteMessage = useMutation(api.messages.deleteMessage);
  // --- END STEP 11 ---

  // --- STEP 13: Message Reactions ---
  const toggleReaction = useMutation(api.messages.toggleReaction);
  // --- END STEP 13 ---

  // --- STEP 8: Typing Indicators ---
  const setTyping = useMutation(api.typing.setTyping);
  const typingIndicators = useQuery(
    api.typing.getTypingStatus,
    conversationId ? { conversationId } : "skip"
  );
  const isOtherUserTyping = typingIndicators && typingIndicators.length > 0;
  // --- END STEP 8 ---

  // Keep other user's online indicator fresh in the header
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  // --- STEP 10: Auto-Scrolling & New Message Alerts ---
  // Smart Auto-Scroll
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const isAtBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;

    const conversationChanged = conversationId !== lastConversationId.current;

    // When switching conversations, always jump to the latest message
    if (conversationChanged) {
      if (messages && messages.length > 0) {
        scrollRef.current.scrollIntoView({ behavior: "auto" });
      }
      lastConversationId.current = conversationId ?? null;
      prevMessageCount.current = messages?.length || 0;
      setShowScrollButton(false);
      return;
    }

    if (messages && messages.length > prevMessageCount.current) {
      // New messages arrived
      const newMessages = messages.slice(prevMessageCount.current);
      const hasNewFromOther = newMessages.some(
        (m) => m.senderId !== currentUser?.id
      );

      if (isAtBottom || messages.length === 1) {
        // User is at bottom: keep them pinned there
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (hasNewFromOther) {
        // User is reading older messages and a new incoming message arrived
        setShowScrollButton(true);
      }
    } else if (isAtBottom) {
      // If typing indicator appears and we are at bottom, scroll down
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }

    prevMessageCount.current = messages?.length || 0;
  }, [messages, isOtherUserTyping, conversationId, currentUser?.id]);

  // Track scroll position to hide button when user manually scrolls to bottom
  useEffect(() => {
    const scrollContainer = scrollRef.current?.closest('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const isAtBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      if (isAtBottom) {
        setShowScrollButton(false);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);
  // --- END STEP 10 ---

  // Mark messages as read when conversation is open and messages change
  useEffect(() => {
    if (conversationId && messages) {
      const unreadMessages = messages.filter(
        (msg) => msg.senderId !== currentUser?.id && !msg.isRead
      );
      
      if (unreadMessages.length > 0) {
        markAsRead({ conversationId });
      }
    }
  }, [conversationId, messages, currentUser?.id, markAsRead]);

  // Handle typing indicator
  useEffect(() => {
    if (!conversationId) return;

    if (newMessage.trim().length > 0) {
      setTyping({ conversationId, isTyping: true });
    } else {
      setTyping({ conversationId, isTyping: false });
    }

    // Set a timeout to clear typing status if user stops typing but doesn't clear input
    const timeoutId = setTimeout(() => {
      setTyping({ conversationId, isTyping: false });
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [newMessage, conversationId, setTyping]);

  const handleSend = async (e: React.FormEvent, retryContent?: string) => {
    e.preventDefault();
    if ((!newMessage.trim() && !retryContent) || !conversationId) return;

    const content = retryContent ?? newMessage.trim();
    setIsSending(true);
    setError(null);
    setUnsentMessage(null);
    if (!retryContent) setNewMessage(""); // Only clear if not retry

    // Force scroll to bottom when sending a message
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);

    try {
      await setTyping({ conversationId, isTyping: false });
      await sendMessage({ conversationId, content });
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
      setUnsentMessage(content);
      setNewMessage(content); // Restore in input
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId || !otherUser) {
    return (
      <div className={`flex-1 h-full flex-col bg-white ${className || "hidden md:flex"}`}>
        <div className="p-4 border-b flex items-center bg-white h-[73px]">
          <h2 className="text-xl font-bold text-zinc-300">Select a chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-zinc-50">
          <p className="text-zinc-500">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const isOtherOnline =
    !!liveOtherUser &&
    liveOtherUser.isOnline &&
    now - liveOtherUser.lastSeen < 60000; // 60s threshold

  return (
    <div className={`flex-1 h-full flex-col bg-white relative ${className || "flex"}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-white h-[73px]">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden mr-1" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={liveOtherUser?.imageUrl} />
            <AvatarFallback>{liveOtherUser?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          {isOtherOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>
        <div>
          <h2 className="font-bold">{liveOtherUser?.name}</h2>
          <p className="text-xs text-zinc-500">
            {isOtherUserTyping ? (
              <span className="text-blue-500 font-medium">typing...</span>
            ) : (
              isOtherOnline ? "Online" : "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-zinc-50 min-h-0">
        <div className="flex flex-col gap-4 p-4 min-h-full">
          {messages === undefined ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p>Loading messages...</p>
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
                <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                    <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {!msg.isDeleted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 text-zinc-400 hover:text-zinc-600" title="React">
                                <SmilePlus className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMe ? "end" : "start"} className="flex flex-row gap-1 p-2 min-w-0">
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction({ messageId: msg._id, emoji })}
                                  className="hover:bg-zinc-100 p-1 rounded text-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {isMe && !msg.isDeleted ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 text-zinc-400 hover:text-zinc-600">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMe ? "end" : "start"}>
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={() => deleteMessage({ messageId: msg._id, type: "for_me" })}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete for me
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={() => deleteMessage({ messageId: msg._id, type: "for_everyone" })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete for everyone
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <button 
                            onClick={() => deleteMessage({ messageId: msg._id, type: "for_me" })}
                            className="p-1 text-zinc-400 hover:text-red-500"
                            title="Delete for me"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div 
                        className={`rounded-2xl px-4 py-2 ${
                          msg.isDeleted 
                            ? "bg-zinc-100 border text-zinc-500 italic rounded-bl-sm"
                            : isMe 
                              ? "bg-blue-600 text-white rounded-br-sm" 
                              : "bg-white border text-zinc-900 rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.isDeleted ? "This message was deleted" : msg.content}</p>
                      </div>
                    </div>
                    
                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        {msg.reactions.map((reaction) => {
                          const hasReacted = currentUser && reaction.users.includes(currentUser.id);
                          return (
                            <button
                              key={reaction.emoji}
                              onClick={() => toggleReaction({ messageId: msg._id, emoji: reaction.emoji })}
                              className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                                hasReacted 
                                  ? "bg-blue-50 border-blue-200 text-blue-600" 
                                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                              }`}
                            >
                              <span>{reaction.emoji}</span>
                              <span className="font-medium">{reaction.users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-400 mt-1 px-1">
                      {formatMessageTime(msg._creationTime)}
                    </span>
                  </div>
                </div>
              );
            })}
            </>
          )}
          
          {/* Typing Indicator */}
          {isOtherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-white border text-zinc-500 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {(messages && messages.length > 0 || isOtherUserTyping) && <div ref={scrollRef} />}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-full shadow-md border bg-white text-blue-600 hover:bg-zinc-50 flex items-center gap-1"
            onClick={() => {
              scrollRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollButton(false);
            }}
          >
            <ArrowDown className="h-4 w-4" />
            New messages
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        {error && (
          <div className="mb-2 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            {unsentMessage && (
              <button
                onClick={(e) => handleSend(e, unsentMessage)}
                className="ml-2 text-xs text-red-700 underline"
                disabled={isSending}
              >
                Retry
              </button>
            )}
            <button onClick={() => { setError(null); setUnsentMessage(null); }} className="ml-auto text-xs text-red-500 underline">Dismiss</button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
// --- END STEP 6 ---
