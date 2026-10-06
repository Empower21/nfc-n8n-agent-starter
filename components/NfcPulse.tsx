/**
 * The signature NFC arc motif: a card corner emitting three concentric
 * arcs. Reused across the experience (entry pulse, typing indicator,
 * diagram language) so the "physical tap → digital intelligence" idea
 * stays visible.
 */
export function NfcPulse({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      {/* Card silhouette */}
      <rect
        x="10"
        y="34"
        width="40"
        height="28"
        rx="4"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <rect x="17" y="42" width="10" height="7" rx="1.5" fill="var(--pulse)" />
      {/* Emitted arcs */}
      <path
        className="nfc-arc"
        d="M58 36c6.6 6.6 6.6 17.4 0 24"
        stroke="var(--pulse)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="nfc-arc nfc-arc-2"
        d="M66 28c11 11 11 29 0 40"
        stroke="var(--pulse)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="nfc-arc nfc-arc-3"
        d="M74 20c15.5 15.5 15.5 40.5 0 56"
        stroke="var(--pulse)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
