# Partner logos

Drop a logo in here and it appears on every partner grid on the site
automatically — there is no code change to make.

The filename must be the partner's name from `PARTNERS` in
`src/config/site.ts`, lowercased with non-alphanumerics collapsed to
hyphens:

| Partner (site.ts)                        | Filename                  |
| ---------------------------------------- | ------------------------- |
| `Sammamish Rotary`                       | `sammamish-rotary.png`    |
| `BlueGrit Wellness`                      | `bluegrit-wellness.png`   |
| `Todd Henderson` (Inglewood Middle School) | `todd-henderson.png`      |
| `Amy Lam` (Sammamish City Council)       | `amy-lam.png`             |

`.png`, `.jpg`, `.jpeg`, `.webp` and `.avif` all work; the extension does
not matter, only the stem. Files are optimized at build time by
`astro:assets`, so ship the highest resolution you have rather than
something pre-shrunk — around 600px on the long edge is plenty.

Logos render inside a fixed-height box with `object-contain`, so wide
lockups and square marks both sit correctly without cropping. A partner
with no file here falls back to the typographic mark, which is what every
partner used before logos existed.

Anything added here is published on the public site. Only add a logo the
partner has given permission to use, and only a photograph of a person
with that person's permission.
