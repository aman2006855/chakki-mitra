"use client";

import { ReactNode } from "react";
import { useSyncPending } from "@/lib/use-sync-pending";

export default function SyncProvider({ children }: { children: ReactNode }) {
  useSyncPending();
  return <>{children}</>;
}
