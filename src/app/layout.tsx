import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "चक्की मित्र - Chakki Mitra",
  description: "आटा चक्की का डिजिटल बहीखाता और बिलिंग प्लेटफॉर्म",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
          document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
          document.addEventListener('gestureend', function(e) { e.preventDefault(); });
          document.addEventListener('touchstart', function(e) {
            if (e.touches && e.touches.length > 1) { e.preventDefault(); }
          }, { passive: false, capture: true });
          document.addEventListener('wheel', function(e) {
            if (e.ctrlKey) { e.preventDefault(); }
          }, { passive: false });
        `}} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
