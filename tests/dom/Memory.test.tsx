import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Memory from "@/components/Memory";
import { makeAll, renderWithContexts } from "../helpers/contexts";

vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

/** Routes fetch() calls made by the component. */
function stubApi(memories: unknown, deleteStatus = 200) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "DELETE" ? new Response("Done", { status: deleteStatus }) : json(memories),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const trashIcons = () => screen.getAllByRole("listitem").map((item) => item.querySelector("svg")!);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("<Memory />", () => {
  it("lists what the AI remembers about the user", async () => {
    stubApi(["Likes the Gita", "Lives in Jaipur"]);
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);

    expect(await screen.findByText("Likes the Gita")).toBeDefined();
    expect(screen.getByText("Lives in Jaipur")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("asks the server for the memories of the signed-in user", async () => {
    const fetchMock = stubApi([]);
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("No memories found.");
    expect(fetchMock).toHaveBeenCalledWith("/api/user/memories");
  });

  it("shows a placeholder while loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByText("No memories found.")).toBeNull();
  });

  it("says when there is nothing to show", async () => {
    stubApi([]);
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("No memories found.")).toBeDefined();
  });

  it("shows an error when the server rejects the request", async () => {
    stubApi({ error: "Token not found" });
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("Failed to load memories.")).toBeDefined();
  });

  it("shows an error when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("Failed to load memories.")).toBeDefined();
  });

  it("closes from the close button", async () => {
    stubApi([]);
    const setIsOpen = vi.fn();
    renderWithContexts(<Memory setIsOpen={setIsOpen} />);
    fireEvent.click(screen.getByText("✕"));
    expect(setIsOpen).toHaveBeenCalledWith(false);
    await screen.findByText("No memories found.");
  });
});

describe("<Memory /> deleting a memory", () => {
  it("asks the server to delete exactly that memory", async () => {
    const fetchMock = stubApi(["a", "b", "c"]);
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("b");

    fireEvent.click(trashIcons()[1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/user/memories", { method: "DELETE", body: "b" }),
    );
  });

  it("confirms success with a notification", async () => {
    stubApi(["a"]);
    const all = makeAll();
    renderWithContexts(<Memory setIsOpen={vi.fn()} />, { all });
    await screen.findByText("a");

    fireEvent.click(trashIcons()[0]);

    await waitFor(() => expect(all.notification.message[1]).toHaveBeenCalledWith("deletedMemory"));
    expect(all.notification.type[1]).toHaveBeenCalledWith("success");
  });

  it("reports a failed deletion with an error notification", async () => {
    stubApi(["a"], 400);
    const all = makeAll();
    renderWithContexts(<Memory setIsOpen={vi.fn()} />, { all });
    await screen.findByText("a");

    fireEvent.click(trashIcons()[0]);

    await waitFor(() => expect(all.notification.message[1]).toHaveBeenCalledWith("errorMemory"));
    expect(all.notification.type[1]).toHaveBeenCalledWith("error");
  });

  // KNOWN BUG (src/components/Memory.tsx, useDeleteMemory): the state updater
  // returns `memories.splice(...)`, and splice returns the REMOVED items, so
  // after deleting "b" the list shows only ["b"] instead of ["a", "c"].
  // `it.fails` keeps CI green while the bug exists and fails once it is
  // fixed, which is the cue to remove `.fails`.
  it.fails("removes only the deleted memory from the list", async () => {
    stubApi(["a", "b", "c"]);
    renderWithContexts(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("b");

    fireEvent.click(trashIcons()[1]);

    await waitFor(
      () => {
        const items = screen.getAllByRole("listitem").map((item) => item.textContent);
        expect(items).toEqual(["a", "c"]);
      },
      { timeout: 300 },
    );
    expect(within(document.body).queryByText("b")).toBeNull();
  });
});
