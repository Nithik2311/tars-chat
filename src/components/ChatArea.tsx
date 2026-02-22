export function ChatArea() {
  return (
    <div className="flex-1 h-full flex flex-col bg-white hidden md:flex">
      <div className="p-4 border-b flex items-center bg-white h-[73px]">
        <h2 className="text-xl font-bold text-zinc-300">Select a chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Select a conversation to start chatting</p>
      </div>
    </div>
  );
}
