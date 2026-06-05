"use client";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";

// Runs once when the dashboard shell mounts. Ensures every user has:
// 1. System categories seeded (idempotent by name)
// 2. fintrack_category_settings records for all their categories
// Both mutations are idempotent — safe to call on every session start.
export function CategorySettingsInit() {
  const seed = useMutation(api.fintrack.categories.seed);
  const initSettings = useMutation(api.fintrack.categories.initializeSettings);

  useEffect(() => {
    seed().then(() => initSettings());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
