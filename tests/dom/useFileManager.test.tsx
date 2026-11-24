import { renderHook, waitFor } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useFileManager from "@/utils/useFileManager";
import { recordNotifications } from "../helpers/stores";

vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));

const existing = (filename: string): UserFileData => ({
  filename,
  isImage: false,
  wholeData: "",
  maindata: { file: new File([""], filename), type: "text/plain", content: "" },
});

function setup(current: UserFileData[] = []) {
  const { sent } = recordNotifications();
  const setFiles = vi.fn();
  const { result } = renderHook(() => useFileManager([current, setFiles]));
  const pick = (...files: File[]) =>
    result.current.handleInput({ target: { files } } as unknown as ChangeEvent<HTMLInputElement>);
  const notified = () => sent.map(({ message }) => message);
  return { pick, setFiles, notified, sent };
}

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

describe("useFileManager: attaching files", () => {
  it("reads a text file as base64 and attaches it", async () => {
    vi.useRealTimers();
    const { pick, setFiles } = setup();

    pick(new File(["hi"], "notes.txt", { type: "text/plain" }));

    await waitFor(() => expect(setFiles).toHaveBeenCalledTimes(1));
    const [files] = setFiles.mock.calls[0] as [UserFileData[]];
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ filename: "notes.txt", isImage: false });
    expect(files[0].maindata.content).toBe("aGk=");
    expect(files[0].maindata.type).toBe("text/plain");
  });

  it("recognises images", async () => {
    vi.useRealTimers();
    const { pick, setFiles } = setup();
    pick(new File(["png-bytes"], "photo.png", { type: "image/png" }));
    await waitFor(() => expect(setFiles).toHaveBeenCalled());
    expect((setFiles.mock.calls[0][0] as UserFileData[])[0].isImage).toBe(true);
  });

  it("accepts a file with no type, such as source code, as plain text", async () => {
    vi.useRealTimers();
    const { pick, setFiles } = setup();
    pick(new File(["print(1)"], "script.py", { type: "" }));
    await waitFor(() => expect(setFiles).toHaveBeenCalled());
    expect((setFiles.mock.calls[0][0] as UserFileData[])[0].maindata.type).toBe("text/plain");
  });

  it("does nothing when no file was chosen", () => {
    const { pick, setFiles, notified } = setup();
    pick();
    expect(setFiles).not.toHaveBeenCalled();
    expect(notified()).toEqual([]);
  });

  it("does not attach the same file name twice", async () => {
    vi.useRealTimers();
    const { pick, setFiles } = setup([existing("notes.txt")]);
    pick(new File(["hi"], "notes.txt", { type: "text/plain" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(setFiles).not.toHaveBeenCalled();
  });
});

describe("useFileManager: limits and validation", () => {
  it("refuses file types it cannot send to Gemini", () => {
    const { pick, setFiles, notified } = setup();
    pick(new File(["MZ"], "setup.exe", { type: "application/x-msdownload" }));
    expect(notified()).toEqual(["unsupportedFileType"]);
    expect(setFiles).not.toHaveBeenCalled();
  });

  it("allows at most three attachments per message", () => {
    const { pick, setFiles, notified } = setup([existing("1.txt"), existing("2.txt"), existing("3.txt")]);
    pick(new File(["x"], "4.txt", { type: "text/plain" }));
    expect(notified()).toEqual(["fileLimitExceeded"]);
    expect(setFiles).not.toHaveBeenCalled();
  });

  it("warns when more files are chosen than there is room for, and keeps what fits", async () => {
    vi.useRealTimers();
    const { pick, setFiles, notified } = setup([existing("1.txt"), existing("2.txt")]);
    pick(
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    );
    expect(notified()).toEqual(["fileLimitExceeded"]);
    await waitFor(() => expect(setFiles).toHaveBeenCalled());
    const [files] = setFiles.mock.calls[0] as [UserFileData[]];
    expect(files.map((file) => file.filename)).toEqual(["1.txt", "2.txt", "a.txt"]);
  });

  it("reports the failure notification as an error", () => {
    const { pick, sent } = setup([existing("1.txt"), existing("2.txt"), existing("3.txt")]);
    pick(new File(["x"], "4.txt", { type: "text/plain" }));
    expect(sent.map(({ type }) => type)).toContain("error");
  });
});

describe("useFileManager: file size limit", () => {
  const LIMIT = 4_096_000; // 4096e3 bytes, as enforced in useFileManager.tsx
  /** A text file that reports the given size without allocating that much memory. */
  const sized = (name: string, size: number) => {
    const file = new File(["x"], name, { type: "text/plain" });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  it("refuses a file larger than the limit", () => {
    const { pick, setFiles, notified, sent } = setup();
    pick(sized("big.txt", LIMIT + 1));
    expect(notified()).toEqual(["fileLimitExceeded"]);
    expect(sent.map(({ type }) => type)).toContain("error");
    expect(setFiles).not.toHaveBeenCalled();
  });

  it("accepts a file of exactly the limit", async () => {
    vi.useRealTimers();
    const { pick, setFiles, notified } = setup();
    pick(sized("edge.txt", LIMIT));
    await waitFor(() => expect(setFiles).toHaveBeenCalled());
    expect(notified()).toEqual([]);
  });

  it("still attaches the other files chosen alongside an oversized one", async () => {
    vi.useRealTimers();
    const { pick, setFiles, notified } = setup();
    pick(sized("big.txt", LIMIT + 1), sized("ok.txt", 10));
    await waitFor(() => expect(setFiles).toHaveBeenCalled());
    expect(notified()).toEqual(["fileLimitExceeded"]);
    const [files] = setFiles.mock.calls[0] as [UserFileData[]];
    expect(files.map((file) => file.filename)).toEqual(["ok.txt"]);
  });
});
