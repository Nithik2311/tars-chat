"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  return (
    <main className="flex h-screen w-full overflow-hidden">
      <Sidebar 
        onSelectChat={(convId, user) => {
          setSelectedConversationId(convId);
          setSelectedUser(user);
        }} 
      />
      <ChatArea 
        conversationId={selectedConversationId} 
        otherUser={selectedUser} 
      />
    </main>
  );
}
