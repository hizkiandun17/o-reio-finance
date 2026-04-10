import type { Metadata } from "next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/components/providers/app-state-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "O-REIO",
  description:
    "Financial operations command center for omni-channel profitability tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppStateProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
