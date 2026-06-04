"use client";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { type ReactNode } from "react";

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
