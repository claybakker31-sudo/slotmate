import { notFound } from "next/navigation";
import { SlotMateShell } from "@/components/SlotMateShell";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function LocaleHomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return <SlotMateShell locale={lang} dict={dict} />;
}
