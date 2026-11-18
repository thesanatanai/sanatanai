import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import html from "@/app/api/utils/mail";
import sendMail, { _sendOTP } from "@/app/api/utils/sendMail";

beforeEach(() => {
  send.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("OTP email template", () => {
  it("contains the placeholder exactly once", () => {
    expect(html.split("{{{OTP}}}")).toHaveLength(2);
  });

  it("is a complete HTML document branded for Sanatan AI", () => {
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Sanatan AI");
  });
});

describe("_sendOTP", () => {
  it("sends the code in both the HTML and the plain-text body", async () => {
    send.mockResolvedValue({ error: null });

    await expect(_sendOTP(123456, "user@example.com")).resolves.toBe(true);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message).toMatchObject({
      to: "user@example.com",
      from: "Sanatan AI <sanatan@shivam.click>",
      subject: "Verify Your Email",
    });
    expect(message.html).toContain("123456");
    expect(message.text).toContain("123456");
    expect(message.html).not.toContain("{{{OTP}}}");
    expect(message.text).not.toContain("{{{OTP}}}");
  });

  it("throws when the provider returns an error", async () => {
    send.mockResolvedValue({ error: new Error("domain not verified") });
    await expect(_sendOTP(123456, "user@example.com")).rejects.toThrow("domain not verified");
  });

  it("throws when the request itself fails", async () => {
    send.mockRejectedValue(new Error("network"));
    await expect(_sendOTP(123456, "user@example.com")).rejects.toThrow("network");
  });
});

describe("sendMail", () => {
  it("sends a plain string as the text body with the default subject", async () => {
    send.mockResolvedValue({});
    await expect(sendMail("hello", "me@example.com")).resolves.toBe(true);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "me@example.com",
      subject: "Mail from Sanatan AI",
      text: "hello",
      from: "Sanatan AI <sanatan@shivam.click>",
    });
  });

  it("sends an object with its own subject and body", async () => {
    send.mockResolvedValue({});
    await sendMail({ subject: "Error Caused", text: "stack trace" }, "me@example.com");
    expect(send.mock.calls[0][0]).toMatchObject({ subject: "Error Caused", text: "stack trace" });
  });

  it("can send HTML", async () => {
    send.mockResolvedValue({});
    await sendMail({ html: "<b>hi</b>" }, "me@example.com");
    expect(send.mock.calls[0][0]).toMatchObject({ html: "<b>hi</b>", subject: "Mail from Sanatan AI" });
  });

  it("never throws: a delivery failure just returns undefined", async () => {
    send.mockRejectedValue(new Error("resend down"));
    await expect(sendMail("hello", "me@example.com")).resolves.toBeUndefined();
  });
});
