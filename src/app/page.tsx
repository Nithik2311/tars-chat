"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

  useEffect(() => {
    // Set online status when component mounts
    updateOnlineStatus({ isOnline: true });

    // Set up a heartbeat to keep the user online
    const interval = setInterval(() => {
      updateOnlineStatus({ isOnline: true });
    }, 30000); // Every 30 seconds

    // Set offline status when window is closed or refreshed
    const handleBeforeUnload = () => {
      updateOnlineStatus({ isOnline: false });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also set offline when component unmounts
      updateOnlineStatus({ isOnline: false });
    };
  }, [updateOnlineStatus]);

  return (
    <main className="flex h-screen w-full overflow-hidden">
      <Sidebar 
        className={selectedConversationId ? "hidden md:flex" : "flex"}
        onSelectChat={(convId, user) => {
          setSelectedConversationId(convId);
          setSelectedUser(user);
        }} 
      />
      <ChatArea 
        className={selectedConversationId ? "flex" : "hidden md:flex"}
        conversationId={selectedConversationId} 
        otherUser={selectedUser} 
        onBack={() => {
          setSelectedConversationId(null);
          setSelectedUser(null);
        }}
      />
    </main>
  );
}
