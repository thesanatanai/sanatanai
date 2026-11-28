import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Memory from "@/components/Memory";
import { recordNotifications } from "../helpers/stores";
import { fakeApi, json, signIn } from "../helpers/api";

vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));

/** Fakes the API calls made by the component. */
function stubApi(memories: unknown, deleteStatus = 204) {
  return fakeApi({
    "GET /v1/me/memories": () => json(memories),
    "DELETE /v1/me/memories": () =>
      deleteStatus === 204 ? new Response(null, { status: 204 }) : json({ error: "No" }, { status: deleteStatus }),
  });
}

const trashIcons = () => screen.getAllByRole("listitem").map((item) => item.querySelector("svg")!);

beforeEach(() => {
  signIn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("<Memory />", () => {
  it("lists what the AI remembers about the user", async () => {
    stubApi(["Likes the Gita", "Lives in Jaipur"]);
    render(<Memory setIsOpen={vi.fn()} />);

    expect(await screen.findByText("Likes the Gita")).toBeDefined();
    expect(screen.getByText("Lives in Jaipur")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("asks the server for the memories of the signed-in user", async () => {
    const { calls } = stubApi([]);
    render(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("No memories found.");
    expect(calls).toMatchObject([{ method: "GET", path: "/v1/me/memories", credentials: "omit", headers: { authorization: "Bearer access-1" } }]);
  });

  it("shows a placeholder while loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = render(<Memory setIsOpen={vi.fn()} />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByText("No memories found.")).toBeNull();
  });

  it("says when there is nothing to show", async () => {
    stubApi([]);
    render(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("No memories found.")).toBeDefined();
  });

  it("shows an error when the server rejects the request", async () => {
    fakeApi({ "GET /v1/me/memories": () => json({ error: "Nope", code: "boom" }, { status: 500 }) });
    render(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("Failed to load memories.")).toBeDefined();
  });

  it("shows an error when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<Memory setIsOpen={vi.fn()} />);
    expect(await screen.findByText("Failed to load memories.")).toBeDefined();
  });

  it("closes from the close button", async () => {
    stubApi([]);
    const setIsOpen = vi.fn();
    render(<Memory setIsOpen={setIsOpen} />);
    fireEvent.click(screen.getByText("✕"));
    expect(setIsOpen).toHaveBeenCalledWith(false);
    await screen.findByText("No memories found.");
  });
});

describe("<Memory /> deleting a memory", () => {
  it("asks the server to delete exactly that memory", async () => {
    const { calls } = stubApi(["a", "b", "c"]);
    render(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("b");

    fireEvent.click(trashIcons()[1]);

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({ method: "DELETE", path: "/v1/me/memories", body: { memory: "b" } }),
      ),
    );
  });

  it("confirms success with a notification", async () => {
    stubApi(["a"]);
    const { sent } = recordNotifications();
    render(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("a");

    fireEvent.click(trashIcons()[0]);

    await waitFor(() => expect(sent).toEqual([{ message: "deletedMemory", type: "success", vars: {} }]));
  });

  it("reports a failed deletion with an error notification", async () => {
    stubApi(["a"], 400);
    const { sent } = recordNotifications();
    render(<Memory setIsOpen={vi.fn()} />);
    await screen.findByText("a");

    fireEvent.click(trashIcons()[0]);

    await waitFor(() => expect(sent).toEqual([{ message: "errorMemory", type: "error", vars: {} }]));
  });

  it("removes only the deleted memory from the list", async () => {
    stubApi(["a", "b", "c"]);
    render(<Memory setIsOpen={vi.fn()} />);
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
