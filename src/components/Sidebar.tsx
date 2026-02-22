import { UserButton } from "@clerk/nextjs";

export function Sidebar() {
  return (
    <div className="w-full md:w-80 h-full border-r bg-zinc-50 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <h2 className="text-xl font-bold">Chats</h2>
        <UserButton />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* User list will go here in the next step */}
        <p className="text-sm text-zinc-500 text-center mt-4">No conversations yet.</p>
      </div>
    </div>
  );
}
