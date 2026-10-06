import type { Metadata } from "next";
import { TapExperience } from "@/components/TapExperience";

export const metadata: Metadata = {
  title: "Tap to Automate",
};

export default async function TapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const asString = (value: string | string[] | undefined) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  return (
    <TapExperience
      cardId={asString(params.card) ?? "DEMO"}
      cardMissing={asString(params.card) === undefined}
      source={asString(params.utm_source)}
      campaign={asString(params.utm_campaign)}
    />
  );
}
