import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    try {
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
      const evt = wh.verify(payloadString, {
        "svix-id": headerPayload.get("svix-id")!,
        "svix-timestamp": headerPayload.get("svix-timestamp")!,
        "svix-signature": headerPayload.get("svix-signature")!,
      }) as any;

      switch (evt.type) {
        case "user.created":
          await ctx.runMutation(internal.users.createUser, {
            clerkId: evt.data.id,
            name: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim(),
            email: evt.data.email_addresses[0].email_address,
            imageUrl: evt.data.image_url,
          });
          break;
        case "user.updated":
          await ctx.runMutation(internal.users.updateUser, {
            clerkId: evt.data.id,
            name: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim(),
            email: evt.data.email_addresses[0].email_address,
            imageUrl: evt.data.image_url,
          });
          break;
        case "user.deleted":
          await ctx.runMutation(internal.users.deleteUser, {
            clerkId: evt.data.id,
          });
          break;
      }
      return new Response("Success", { status: 200 });
    } catch (err) {
      console.error("Webhook Error:", err);
      return new Response("Webhook Error", { status: 400 });
    }
  }),
});

export default http;
