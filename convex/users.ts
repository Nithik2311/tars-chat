import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- STEP 4: Sidebar & User List UI (Backend Query) ---
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // If the user isn't authenticated yet (e.g. during initial hydration),
      // just return an empty list instead of throwing. The UI will show
      // "No other users" until Clerk/Convex auth is ready.
      return [];
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

          // Hide messages this user deleted "for me" in sidebar previews
          const visibleMessages = messages.filter(
            (msg) => !msg.deletedBy?.includes(me)
          );

          if (visibleMessages.length > 0) {
            const rawLast = visibleMessages[visibleMessages.length - 1];
            // If the last visible message was deleted for everyone,
            // normalize content so the sidebar doesn't show the old text.
            lastMessage = rawLast.isDeleted
              ? { ...rawLast, content: "This message was deleted" }
              : rawLast;
          }

          unreadCount = visibleMessages.filter(
            (msg) => msg.senderId !== me && !msg.isRead
          ).length;
        }

        return { ...user, lastMessage, unreadCount };
      })
    );

    return usersWithMessages;
  },
});
// --- END STEP 4 ---

// --- STEP 3: User Syncing & Online Status ---
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
// --- END STEP 3 ---

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
