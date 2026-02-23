import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- STEP 7: Fetching & Sending Messages ---
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
      .collect();
      
    return messages.filter(msg => !msg.deletedBy?.includes(identity.subject));
  }
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: identity.subject,
      content: args.content,
      isRead: false,
    });
  }
});
// --- END STEP 7 ---

// --- STEP 9: Read Receipts ---
export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
      .collect();

    for (const msg of messages) {
      if (msg.senderId !== identity.subject && !msg.isRead) {
        await ctx.db.patch(msg._id, { isRead: true });
      }
    }
  }
});
// --- END STEP 9 ---

// --- STEP 11: Message Deletion (Soft Delete) ---
export const deleteMessage = mutation({
  args: { 
    messageId: v.id("messages"),
    type: v.union(v.literal("for_me"), v.literal("for_everyone"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    
    if (args.type === "for_everyone") {
      if (message.senderId !== identity.subject) {
        throw new Error("Unauthorized to delete this message for everyone");
      }
      await ctx.db.patch(args.messageId, { isDeleted: true });
    } else if (args.type === "for_me") {
      const deletedBy = message.deletedBy || [];
      if (!deletedBy.includes(identity.subject)) {
        await ctx.db.patch(args.messageId, { 
          deletedBy: [...deletedBy, identity.subject] 
        });
      }
    }
  }
});
// --- END STEP 11 ---

// --- STEP 13: Message Reactions ---
// Rule: One reaction per user per message.
// - If user clicks a different emoji, their old reaction is removed and the new one is added.
// - If user clicks the same emoji again, their reaction is removed (toggle off).
export const toggleReaction = mutation({
  args: { messageId: v.id("messages"), emoji: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const userId = identity.subject;
    const reactions = message.reactions || [];

    // Check if the user already has this exact emoji on this message
    const alreadyHadThisEmoji = reactions.some(
      (r) => r.emoji === args.emoji && r.users.includes(userId)
    );

    // First, remove the user from all existing reactions for this message
    const cleanedReactions = reactions
      .map((r) => ({
        emoji: r.emoji,
        users: r.users.filter((u) => u !== userId),
      }))
      .filter((r) => r.users.length > 0);

    // If they clicked the same emoji again, we simply keep it removed (toggle off)
    if (!alreadyHadThisEmoji) {
      // User is switching / adding a new reaction
      const idx = cleanedReactions.findIndex((r) => r.emoji === args.emoji);
      if (idx !== -1) {
        cleanedReactions[idx] = {
          ...cleanedReactions[idx],
          users: [...cleanedReactions[idx].users, userId],
        };
      } else {
        cleanedReactions.push({ emoji: args.emoji, users: [userId] });
      }
    }

    await ctx.db.patch(args.messageId, { reactions: cleanedReactions });
  }
});
// --- END STEP 13 ---
