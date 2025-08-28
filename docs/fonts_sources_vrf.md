# Font Sources and Download Guide (phase: [vrf])

Credible places to browse and download font families used in BrandKit. Always check the license per family before using commercially.

- Google Fonts (primary)
  - Browse/download: https://fonts.google.com
  - Direct family page: https://fonts.google.com/specimen/{Family+Name}
  - How to use: copy the provided <link> or CSS @import. Our app can load any Google Fonts family by name.

- Fontshare (by Indian Type Foundry)
  - Browse/download: https://www.fontshare.com
  - Example family: https://www.fontshare.com/fonts/general-sans
  - Licenses: Typically free; check each family page.

- The League of Moveable Type
  - Browse/download: https://www.theleagueofmoveabletype.com
  - Open-source fonts under permissive licenses.

- Velvetyne Type Foundry
  - Browse/download: https://velvetyne.fr/fonts/
  - Open-source experimental and display faces; check individual licenses.

- Inter (project site)
  - Project: https://rsms.me/inter/
  - GitHub releases: https://github.com/rsms/inter/releases/latest

- Adobe “Source” superfamily
  - Source Sans: https://github.com/adobe-fonts/source-sans/releases
  - Source Serif: https://github.com/adobe-fonts/source-serif/releases
  - Source Code Pro: https://github.com/adobe-fonts/source-code-pro/releases

- Google Fonts (GitHub mirror)
  - Repository: https://github.com/google/fonts
  - Useful for programmatic/self-hosted downloads. Verify OFL/Apache licenses per directory.

Self-hosting tips
- Prefer WOFF2. Keep WOFF as fallback if needed.
- Subset character ranges to reduce payload when possible.
- In CSS, declare @font-face with font-display: swap and a robust fallback stack.

License notes
- Many Google Fonts are OFL; some are Apache-2.0 or other. Always verify on the family page.
- When in doubt, link users to the family’s specimen page (included in the UI) to download the official ZIP.

