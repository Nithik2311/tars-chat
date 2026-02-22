import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const me = identity.subject;
    const users = await ctx.db.query("users").collect();
    const otherUsers = users.filter((user) => user.clerkId !== me);

    // Check if users are actually online based on lastSeen (e.g., within the last 1 minute)
    const now = Date.now();
    const activeUsers = otherUsers.map(user => ({
      ...user,
      isOnline: user.isOnline && (now - user.lastSeen < 60000) // 60 seconds threshold
    }));

    // Fetch the last message for each user to display in the sidebar
    const usersWithMessages = await Promise.all(
      activeUsers.map(async (user) => {
        let conv = await ctx.db.query("conversations")
          .withIndex("by_participants", q => q.eq("participantOne", me).eq("participantTwo", user.clerkId))
          .unique();

        if (!conv) {
          conv = await ctx.db.query("conversations")
            .withIndex("by_participants", q => q.eq("participantOne", user.clerkId).eq("participantTwo", me))
            .unique();
        }

        let lastMessage = null;
        let unreadCount = 0;
        if (conv) {
          const messages = await ctx.db.query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", conv._id))
            .collect();
            
          if (messages.length > 0) {
            lastMessage = messages[messages.length - 1];
          }
          
          unreadCount = messages.filter(
            msg => msg.senderId !== me && !msg.isRead
          ).length;
        }

        return { ...user, lastMessage, unreadCount };
      })
    );

    return usersWithMessages;
  },
});

export const updateStatus = internalMutation({
  args: {
    clerkId: v.string(),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

export const updateOnlineStatus = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const updateUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
  },
});
