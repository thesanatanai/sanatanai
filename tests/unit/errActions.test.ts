import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/app/api/utils/sendMail", () => ({ default: sendEmail }));

import sendErr from "@/actions/errActions";

beforeEach(() => {
  sendEmail.mockReset();
});

describe("sendErr (client error reports)", () => {
  it("does not send email outside production", async () => {
    for (const env of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      await sendErr(new Error("boom"));
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("emails the stack trace to the maintainer in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new Error("boom");
    await sendErr(error);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [options, recipient] = sendEmail.mock.calls[0];
    expect(options.subject).toBe("Error Caused");
    expect(options.text).toContain(error.stack);
    expect(recipient).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it("falls back to the message when there is no stack", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new Error("no stack here");
    error.stack = undefined;
    await sendErr(error);
    expect(sendEmail.mock.calls[0][0].text).toContain("no stack here");
  });
});
