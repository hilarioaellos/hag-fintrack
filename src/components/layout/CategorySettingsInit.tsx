"use client";
import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";

export function CategorySettingsInit() {
  const settings = useQuery(api.fintrack.user_settings.get);
  const cleanLegacy = useMutation(api.fintrack.categories.cleanLegacySystemCategories);
  const seed = useMutation(api.fintrack.categories.seed);
  const ensureSystem = useMutation(api.fintrack.categories.ensureSystemCategories);
  const initSettings = useMutation(api.fintrack.categories.initializeSettings);
  const ran = useRef(false);

  useEffect(() => {
    if (settings === undefined || ran.current) return;
    ran.current = true;

    const alreadyReviewed = settings?.categoriesReviewed === true;
    cleanLegacy()
      .then(() => (alreadyReviewed ? Promise.resolve() : seed()))
      .then(() => ensureSystem())
      .then(() => initSettings());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return null;
}
