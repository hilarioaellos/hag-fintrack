import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabs } from "./MobileTabs";
import { CategorySettingsInit } from "./CategorySettingsInit";
import { CategoryOnboardingModal } from "./CategoryOnboardingModal";
import { CategoryOnboardingProvider } from "@/components/providers/CategoryOnboardingProvider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CategoryOnboardingProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: "var(--color-ft-bg)" }}
      >
        <CategorySettingsInit />
        <CategoryOnboardingModal />
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
        <MobileTabs />
      </div>
    </CategoryOnboardingProvider>
  );
}
