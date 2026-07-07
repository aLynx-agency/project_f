"use client";

import { useState } from "react";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const [thrown, setThrown] = useState(false);

  function triggerError() {
    setThrown(true);
    Sentry.captureException(new Error("Sentry test error from sentry-example-page"));
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="text-center">
        <h1 className="text-2xl font-bold">Sentry Test</h1>
        <p className="mt-2 text-sm text-gray-600">
          Click the button to send a test error to Sentry.
        </p>
        <button
          className="mt-6 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          disabled={thrown}
          onClick={triggerError}
        >
          {thrown ? "Error sent — check Sentry" : "Send test error"}
        </button>
      </section>
    </main>
  );
}
