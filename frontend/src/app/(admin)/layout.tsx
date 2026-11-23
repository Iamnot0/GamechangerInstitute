import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Staff console",
  robots: { index: false, follow: false },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#173f35",
    colorText: "#0f2a23",
    colorBackground: "#f6f3ec",
    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
    borderRadius: "2px",
  },
};

export default function AdminRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ClerkProvider appearance={clerkAppearance} dynamic>
      {children}
    </ClerkProvider>
  );
}
