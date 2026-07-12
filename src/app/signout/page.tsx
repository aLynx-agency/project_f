"use client";
import React, { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth/auth-client";

const Signout = () => {
  const router = useRouter();
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    signOut()
      .then(() => router.push("/"))
      .catch(() => {
        setError(true);
      });
  }, [router]);

  return <div>{error ? "Failed to sign out, please clear cookies." : "Signing out..."}</div>;
};

export default Signout;
