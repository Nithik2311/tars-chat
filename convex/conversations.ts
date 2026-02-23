import { internalMutation } from "./_generated/server";

export const migrateParticipants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    for (const conv of conversations) {
      if (!conv.participants) {
        const participants = [];
        if (conv.participantOne) participants.push(conv.participantOne);
        if (conv.participantTwo) participants.push(conv.participantTwo);
        await ctx.db.patch(conv._id, { participants });
      }
    }
  }
});
export const createGroup = mutation({
  args: { groupName: v.string(), participantIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Ensure creator is included
    const allParticipants = Array.from(new Set([identity.subject, ...args.participantIds]));
    const id = await ctx.db.insert("conversations", {
      groupName: args.groupName,
      participants: allParticipants,
      isGroup: true,
    });
    return id;
  }
});
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// --- STEP 5: 1-on-1 Conversations ---
export const getOrCreate = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const me = identity.subject;
    const them = args.otherUserId;

    // Check if conversation exists where I am participantOne
    let conv = await ctx.db.query("conversations")
      .withIndex("by_participants", q => q.eq("participantOne", me).eq("participantTwo", them))
      .unique();

    // Check if conversation exists where I am participantTwo
    if (!conv) {
      conv = await ctx.db.query("conversations")
        .withIndex("by_participants", q => q.eq("participantOne", them).eq("participantTwo", me))
        .unique();
    }

    // If no conversation exists, create one
    if (!conv) {
      const id = await ctx.db.insert("conversations", {
        participantOne: me,
        participantTwo: them,
        participants: [me, them],
        isGroup: false,
      });
      return id;
    }

    return conv._id;
  }
});
// --- END STEP 5 ---
