import { getSongById, SONGS } from "@/data/songs";
import { notFound } from "next/navigation";
import PracticeClient from "./PracticeClient";

export async function generateStaticParams() {
  return SONGS.map((s) => ({ songId: s.id }));
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;
  const song = getSongById(songId);
  if (!song) notFound();
  return <PracticeClient song={song} />;
}
