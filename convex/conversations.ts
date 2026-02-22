import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
      });
      return id;
    }

    return conv._id;
  }
});
