# Programming the NFC Card

## Canonical URL

Write exactly this (replace DOMAIN with the deployed hostname):

```text
https://DOMAIN/tap?card=N8N001&utm_source=nfc&utm_campaign=tap-to-automate
```

The app reads `card`, `utm_source`, and `utm_campaign` and stores them on
the session. Give every physical card its own `card` value (N8N001,
N8N002, …) so taps are attributable per card.

## How to write the card

1. Use an NFC writer app — **NFC Tools** (iOS/Android) works well.
2. Write a single **URL record** (NDEF, type URI). Nothing else on the tag.
3. Test on both iPhone (tap top edge of the phone to the card) and
   Android before locking.
4. Only lock the tag once the deployed URL is final — locking is
   permanent.

Tag guidance: NTAG215/216 have ample room; even NTAG213 (~144 bytes) fits
this URL. Keep the URL short if you switch domains.

## QR fallback

Some contexts (older phones, laptops, print) can't tap. Generate a QR code
pointing at the same URL but with `utm_source=qr`:

```text
https://DOMAIN/tap?card=N8N001&utm_source=qr&utm_campaign=tap-to-automate
```

Print it on the back of the card or the event one-pager. The app treats it
identically — `utm_source` tells you which channel fired. NFC stays the
primary interaction; QR is the graceful fallback.

## Missing/typoed card IDs

If someone opens `/tap` without a `card` parameter, the app falls back to
the `DEMO` card and shows a subtle "preview" badge — the experience never
breaks.
