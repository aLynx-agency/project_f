import { beforeEach, expect, test, vi } from "vitest";

import { sendMagicLink } from "./magicLink";
import { resend } from "./resend";

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock("./resend", () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html></html>"),
}));

test("resend error → throws with the message", async () => {
  vi.spyOn(resend.emails, "send").mockResolvedValue({
    data: null,
    error: { name: "application_error", message: "Something went wrong", statusCode: 503 },
    headers: null,
  });

  await expect(sendMagicLink("test@example.com", "https://example.com/magic")).rejects.toThrow(
    "Failed to send magic link: Something went wrong",
  );
});

test("resend success → calls send with correct params", async () => {
  const spy = vi.spyOn(resend.emails, "send").mockResolvedValue({
    data: { id: "xyz" },
    error: null,
    headers: null,
  });

  await sendMagicLink("test@example.com", "https://example.com/magic");

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      from: "Alynx <hello@alynx.agency>",
      to: ["test@example.com"],
      replyTo: "hello@alynx.agency",
      subject: "Your Alynx sign-in link",
    }),
  );
});
