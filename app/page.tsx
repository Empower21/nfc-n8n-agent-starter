import Link from "next/link";
import { redirect } from "next/navigation";
import { NfcPulse } from "@/components/NfcPulse";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // NFC cards programmed with the bare domain (or legacy /?card=) still land
  // in the experience.
  if (typeof params.card === "string" && params.card) {
    const query = new URLSearchParams();
    query.set("card", params.card);
    if (typeof params.utm_source === "string") query.set("utm_source", params.utm_source);
    if (typeof params.utm_campaign === "string") query.set("utm_campaign", params.utm_campaign);
    redirect(`/tap?${query.toString()}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <NfcPulse size={72} />
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Tap to Automate
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[var(--ink-soft)]">
          This experience begins with a physical tap. Hold your phone to the
          card, or preview it below.
        </p>
      </div>
      <Link
        href="/tap?card=DEMO"
        className="rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--pulse)] hover:text-[var(--pulse)]"
      >
        Preview the experience
      </Link>
    </main>
  );
}
