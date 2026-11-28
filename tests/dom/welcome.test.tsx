import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Email from "@/app/(root)/welcome/Email";
import Welcome from "@/app/(root)/welcome/page";
import { useAppStore } from "@/stores/appStore";
import { fakeApi, json } from "../helpers/api";

vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));
vi.mock("@/components/Particles", () => ({ ParticleBackground: () => null }));
vi.mock("@/app/(root)/welcome/WelcomeStep", () => ({ default: () => <p>welcome step</p> }));

const result = {
  expiresIn: 900,
  user: { id: "u1", name: "S", email: "s@example.com", picture: "", preferredLocale: "hi", memories: [] },
};

let location: { href: string; search: string; replace: ReturnType<typeof vi.fn> };
beforeEach(() => {
  location = { href: "/welcome", search: "", replace: vi.fn() };
  vi.stubGlobal("location", location);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("<Email /> (sign in with a code)", () => {
  const setIsLoading = vi.fn();
  const mount = () => render(<Email setIsLoading={setIsLoading} />);
  const type = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });
  const clickButton = (index: number) => fireEvent.click(document.querySelectorAll("button")[index]);

  beforeEach(() => setIsLoading.mockClear());

  it("does not call the API for an address that is not an email", () => {
    const { fetchMock } = fakeApi({});
    mount();
    type("email", "not-an-email");
    clickButton(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector(".text-red-400")!.textContent).not.toBe("");
  });

  it("asks the API to email a code, then shows the code field and the waiting time", async () => {
    const { calls } = fakeApi({ "POST /v1/auth/otp/request": { message: "Done", newIn: 120 } });
    mount();
    type("email", "s@example.com");
    clickButton(0);

    await waitFor(() => expect(document.getElementById("otp")).not.toBeNull());
    expect(calls).toMatchObject([{ path: "/v1/auth/otp/request", body: { email: "s@example.com" } }]);
    expect(useAppStore.getState().email).toBe("s@example.com");
    expect(screen.getByText(/2:00/)).toBeDefined();
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it("goes to the code field, with the server's wait, when a code was already sent a moment ago", async () => {
    fakeApi({
      "POST /v1/auth/otp/request": () =>
        json({ error: "OTP already sent.", code: "rate_limited", newIn: 45 }, { status: 429 }),
    });
    mount();
    type("email", "s@example.com");
    clickButton(0);
    await waitFor(() => expect(document.getElementById("otp")).not.toBeNull());
    expect(screen.getByText(/0:45/)).toBeDefined();
  });

  it("shows a general error when the code could not be sent", async () => {
    fakeApi({ "POST /v1/auth/otp/request": () => json({ error: "No mail", code: "mail_failed" }, { status: 502 }) });
    mount();
    type("email", "s@example.com");
    clickButton(0);
    await waitFor(() => expect(document.querySelector(".text-red-400")!.textContent).not.toBe(""));
    expect(document.getElementById("otp")).toBeNull();
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });

  async function reachCodeField() {
    fakeApi({
      "POST /v1/auth/otp/request": { message: "Done", newIn: 120 },
      "POST /v1/auth/otp/verify": () => json(result),
    });
    mount();
    type("email", "s@example.com");
    clickButton(0);
    await waitFor(() => expect(document.getElementById("otp")).not.toBeNull());
  }

  it("signs in with the code and the chosen language, with cookies, and opens the app", async () => {
    await reachCodeField();
    act(() => useAppStore.setState({ language: "hi" }));
    const { calls } = fakeApi({ "POST /v1/auth/otp/verify": () => json(result) });
    type("otp", "123456");
    fireEvent.click(screen.getByText(/submit|जमा|Submit/i));

    await waitFor(() => expect(location.href).toBe("/app"));
    expect(calls).toMatchObject([
      { path: "/v1/auth/otp/verify", body: { email: "s@example.com", otp: "123456", locale: "hi" }, credentials: "include" },
    ]);
    expect(localStorage.length).toBe(0);
  });

  it("shows the API's message for a wrong code, and stays", async () => {
    await reachCodeField();
    fakeApi({ "POST /v1/auth/otp/verify": () => json({ error: "OTP Invalid", code: "otp_invalid" }, { status: 400 }) });
    type("otp", "000000");
    fireEvent.click(screen.getByText(/submit|जमा|Submit/i));

    await waitFor(() => expect(document.querySelector(".text-red-400")!.textContent).toBe("OTP Invalid"));
    expect(location.href).toBe("/welcome");
  });

  it("shows the lockout message from the API", async () => {
    await reachCodeField();
    fakeApi({
      "POST /v1/auth/otp/verify": () =>
        json({ error: "Too many attempts. Please try again later.", code: "rate_limited" }, { status: 429 }),
    });
    type("otp", "000000");
    fireEvent.click(screen.getByText(/submit|जमा|Submit/i));
    await waitFor(() =>
      expect(document.querySelector(".text-red-400")!.textContent).toBe("Too many attempts. Please try again later."),
    );
  });

  it("shows a general error when the network fails", async () => {
    await reachCodeField();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    type("otp", "123456");
    fireEvent.click(screen.getByText(/submit|जमा|Submit/i));
    await waitFor(() => expect(document.querySelector(".text-red-400")!.textContent).not.toBe(""));
    expect(location.href).toBe("/welcome");
  });
});

describe("the sign-in page", () => {
  it("shows the sign-in steps and calls nothing for a plain visit (the proxy has already moved signed-in visitors on)", () => {
    const { fetchMock } = fakeApi({});
    render(<Welcome />);
    expect(screen.getByText("welcome step")).toBeDefined();
    expect(location.replace).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ends the session on the server, which clears the cookies, when opened with ?logout=true", async () => {
    location.search = "?logout=true";
    const { calls } = fakeApi({ "POST /v1/auth/logout": () => new Response(null, { status: 204 }) });
    render(<Welcome />);
    await waitFor(() => expect(calls).toMatchObject([{ path: "/v1/auth/logout", body: undefined, credentials: "include" }]));
    expect(location.replace).not.toHaveBeenCalled(); // no redirect loop
  });
});
