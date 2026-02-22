import { internalMutation, query } from "./_generated/server";
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

    // Fetch the last message for each user to display in the sidebar
    const usersWithMessages = await Promise.all(
      otherUsers.map(async (user) => {
        let conv = await ctx.db.query("conversations")
          .withIndex("by_participants", q => q.eq("participantOne", me).eq("participantTwo", user.clerkId))
          .unique();

        if (!conv) {
          conv = await ctx.db.query("conversations")
            .withIndex("by_participants", q => q.eq("participantOne", user.clerkId).eq("participantTwo", me))
            .unique();
        }

        let lastMessage = null;
        if (conv) {
          lastMessage = await ctx.db.query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", conv._id))
            .order("desc")
            .first();
        }

        return { ...user, lastMessage };
      })
    );

    return usersWithMessages;
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
