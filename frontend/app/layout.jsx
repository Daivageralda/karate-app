import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { APP_CONFIG } from "@/shared/config/app";
import { ToastProvider } from "@/shared/components/toast-provider";
import { THEME_STYLE_VARIABLES } from "@/shared/config/theme";

const primaryFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: APP_CONFIG.appName,
  description: APP_CONFIG.appDescription,
};

export default function RootLayout({ children }) {
  return (
    <html lang={APP_CONFIG.htmlLang}>
      <body
        className={`${primaryFont.variable} ${displayFont.variable} antialiased`}
        style={THEME_STYLE_VARIABLES}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}