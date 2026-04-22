import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Update your account",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
