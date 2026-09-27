"use client";
import { useEffect, useState } from "react";
import MemorySkeleton from "./skeletons/Memory";

export default function Memory({ setIsOpen }: { setIsOpen: (value: boolean) => void }) {
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState(false);
    const [memories, setMemories] = useState<string[]>([]);

    useEffect(() => {
        async function get() {
            try {
                const memories = await fetch("/api/user/memories").then(response => response.json());
                if(memories.error) return setError(true);
                setMemories(memories);
                setFetched(true);
            } catch {
                setError(true);
                setFetched(true);
            }
        }
        get();
    }, []);

    return (
        <div className="fullscreen center-flex" style={{
            zIndex: 6,
            display: "flex"
        }}>
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
                            <li key={index} className="text-gray-300">
                                {memory}
                            </li>
                        ))}
                    </ul>
                )}
              </div>
            </div>
        </div>
    )
}