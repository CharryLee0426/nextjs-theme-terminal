import type { Metadata } from "next";
import { PublishedGameGallery } from "@/components/game/AiGameCreator";

export const metadata: Metadata = {
  title: "Games",
  description: "Play published browser mini games and start creating one with AI.",
};

export default function GamePage() {
  return <PublishedGameGallery />;
}
