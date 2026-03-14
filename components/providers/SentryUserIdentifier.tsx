'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { SafeUser } from "@/types";

interface SentryUserIdentifierProps {
  currentUser?: SafeUser | null;
}

const SentryUserIdentifier: React.FC<SentryUserIdentifierProps> = ({ currentUser }) => {
  useEffect(() => {
    if (currentUser) {
      Sentry.setUser({
        id: currentUser.id,
        email: currentUser.email || undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [currentUser]);

  return null;
};

export default SentryUserIdentifier;
