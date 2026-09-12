
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terrain & Trail Guard | AI Geological Hazard Assessment",
  description: "Computer-vision hazard evaluation for backcountry trails, rockfall, landslides, and mountaineering safety.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
