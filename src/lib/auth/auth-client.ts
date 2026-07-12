import { magicLinkClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const { signUp, signIn, signOut, useSession } = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient(), magicLinkClient()],
});
