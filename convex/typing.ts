import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .unique();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: userId,
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getTypingStatus = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const myId = identity.subject;

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Filter out my own typing status and only return those who are typing
    // and whose status was updated in the last 5 seconds (to handle disconnected clients)
    const now = Date.now();
    return indicators.filter(
      (ind) => ind.userId !== myId && ind.isTyping && (now - ind.updatedAt < 5000)
    );
  },
});
