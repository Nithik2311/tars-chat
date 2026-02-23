import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// --- STEP 2: Database Schema Design (Convex) ---
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    groupName: v.optional(v.string()),
    participants: v.optional(v.array(v.string())), // array of Clerk IDs, now optional
    isGroup: v.optional(v.boolean()),
    participantOne: v.optional(v.string()),
    participantTwo: v.optional(v.string()),
  })
    .index("by_participants", ["participantOne", "participantTwo"])
    .index("by_participantOne", ["participantOne"])
    .index("by_participantTwo", ["participantTwo"])
    .index("by_group", ["isGroup"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    isTyping: v.boolean(),
    updatedAt: v.number(),
  }).index("by_conversationId", ["conversationId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    content: v.string(),
    isRead: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
    deletedBy: v.optional(v.array(v.string())),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          users: v.array(v.string()),
        })
      )
    ),
  }).index("by_conversationId", ["conversationId"]),
});
// --- END STEP 2 ---
