"use client";
import { useEffect, useState } from "react";
import MemorySkeleton from "./skeletons/Memory";
import { Trash } from "lucide-react";
import { useNotification } from "./Notification";

export default function Memory({
  setIsOpen,
}: Readonly<{
  setIsOpen: (value: boolean) => void;
}>) {
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const deleteMemory = useDeleteMemory(setMemories);

  useEffect(() => {
    async function get() {
      try {
        const memories = await fetch("/api/user/memories").then((response) =>
          response.json(),
        );
        if (memories.error) return setError(true);
        setMemories(memories);
        setFetched(true);
      } catch {
        setError(true);
        setFetched(true);
      }
    }
    void get();
  }, []);

  return (
    <div
      className="fullscreen center-flex"
      style={{
        zIndex: 6,
        display: "flex",
      }}
    >
      <div className="w-full h-full max-w-100 max-h-120 bg-(--primary-color) shadow-2xl shadow-black rounded-lg">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 relative">
          <h1 className="font-display text-2xl">Memories</h1>
          <button className="close close-btn" onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </header>
        <div className="p-4 overflow-y-auto h-full col gap-0.5">
          {error && <p className="text-red-500">Failed to load memories.</p>}
          {!error && !fetched && <MemorySkeleton />}
          {fetched && memories.length === 0 && <p>No memories found.</p>}
          {fetched && memories.length > 0 && (
            <ul className="list-disc pl-5">
              {memories.map((memory, index) => (
                <li
                  key={memory || index}
                  className="text-gray-300 flex justify-between my-2 p-2 rounded-lg bg-(--text-color)/5"
                >
                  {memory}
                  <Trash
                    className="rounded-full p-1 transition-all duration-300 hover:bg-red-500/50 cursor-pointer"
                    onClick={() => deleteMemory(memory)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function useDeleteMemory(
  setMemories: (value: (memories: string[]) => string[]) => void,
) {
  const notification = useNotification();
  return function deleteMemory(memory: string) {
    setMemories((memories) => memories.splice(memories.indexOf(memory), 1));

    void fetch("/api/user/memories", {
      method: "DELETE",
      body: memory,
    }).then((response) => {
      if (response.ok)
        return notification("deletedMemory", {
          language: true,
          type: "success",
        });
      return notification("errorMemory", {
        language: true,
        type: "error",
      });
    });
  };
}
