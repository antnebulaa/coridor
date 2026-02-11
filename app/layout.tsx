// Root layout is intentionally minimal.
// All rendering is handled by app/[locale]/layout.tsx
// This file only exists to satisfy Next.js root layout requirement.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
