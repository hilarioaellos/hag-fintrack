"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CategoryOnboardingContext = createContext<ContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function CategoryOnboardingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CategoryOnboardingContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </CategoryOnboardingContext.Provider>
  );
}

export const useCategoryOnboarding = () => useContext(CategoryOnboardingContext);
