import type { Metadata } from "next";
import { AiGameCreator } from "@/components/game/AiGameCreator";

export const metadata: Metadata = {
  title: "Game",
  description: "Create, preview, edit, and publish AI-generated browser mini games.",
};

export default function GamePage() {
  return <AiGameCreator />;
}
