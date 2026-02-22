import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
