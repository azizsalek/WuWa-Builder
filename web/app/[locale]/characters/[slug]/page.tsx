import { notFound } from "next/navigation";
import { CharacterProfile } from "@/components/character-profile";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function CharacterPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  return <CharacterProfile locale={rawLocale as Locale} slug={slug} />;
}
