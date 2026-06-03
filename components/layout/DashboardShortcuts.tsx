"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toggleVacationMode } from "@/lib/actions/settings";

export function DashboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "v" || e.key === "V") {
        await toggleVacationMode();
        router.refresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
