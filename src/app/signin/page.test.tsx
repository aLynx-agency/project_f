import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, expect, test, afterEach, beforeEach } from "vitest";

import { signIn } from "@/lib/auth/auth-client";

import SignIn from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/auth/auth-client", () => ({
  signIn: {
    social: vi.fn(),
    magicLink: vi.fn(),
  },
}));

const TEST_EMAIL = "test@example.com";

function assertFormVisible() {
  expect(screen.getByText(/sign in to alynx/i)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /continue with google/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /continue with email/i }),
  ).toBeInTheDocument();
}

test("signin form renders", () => {
  render(<SignIn />);
  assertFormVisible();
});

test("clicking Google calls signIn.social with correct args", async () => {
  vi.mocked(signIn.social).mockResolvedValue(undefined);

  render(<SignIn />);

  await userEvent.click(
    screen.getByRole("button", { name: /continue with google/i }),
  );

  expect(vi.mocked(signIn.social)).toHaveBeenCalledWith({
    provider: "google",
    callbackURL: "/dashboard",
    newUserCallbackURL: "/welcome",
    errorCallbackURL: "/signin?error=oauth",
  });
});

test("clicking Submit calls signIn.magicLink with correct args", async () => {
  vi.mocked(signIn.magicLink).mockResolvedValue(undefined);

  render(<SignIn />);

  await userEvent.type(screen.getByLabelText(/email/i), TEST_EMAIL);
  await userEvent.click(
    screen.getByRole("button", { name: /continue with email/i }),
  );

  expect(vi.mocked(signIn.magicLink)).toHaveBeenCalledWith({
    email: "test@example.com",
    callbackURL: "/dashboard",
    newUserCallbackURL: "/welcome",
    errorCallbackURL: "/error",
  });
});

test("magicLink reject shows error message", async () => {
  vi.mocked(signIn.magicLink).mockRejectedValue(new Error("Failed"));

  render(<SignIn />);

  await userEvent.type(screen.getByLabelText(/email/i), TEST_EMAIL);
  await userEvent.click(
    screen.getByRole("button", { name: /continue with email/i }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Something went wrong. Please try again.",
  );
});

test("successful send shows check inbox + email address", async () => {
  vi.mocked(signIn.magicLink).mockResolvedValue(undefined);

  render(<SignIn />);

  await userEvent.type(screen.getByLabelText(/email/i), TEST_EMAIL);
  await userEvent.click(
    screen.getByRole("button", { name: /continue with email/i }),
  );

  expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
    "Check your inbox",
  );
  expect(await screen.findByText(TEST_EMAIL)).toBeInTheDocument();
});

test("'use a different email' returns to sign-in form", async () => {
  vi.mocked(signIn.magicLink).mockResolvedValue(undefined);

  render(<SignIn />);

  await userEvent.type(screen.getByLabelText(/email/i), TEST_EMAIL);
  await userEvent.click(
    screen.getByRole("button", { name: /continue with email/i }),
  );

  await userEvent.click(
    await screen.findByRole("button", { name: /use a different email/i }),
  );

  assertFormVisible();
});

test("google sign-in failure shows error message", async () => {
  vi.mocked(signIn.social).mockRejectedValue(new Error("Failed"));

  render(<SignIn />);

  await userEvent.click(
    screen.getByRole("button", { name: /continue with google/i }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn't start Google sign-in.",
  );
});
