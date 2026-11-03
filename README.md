# Pinball

Playable static build hosted for DirectiveDemos.

- Source repository: DranakCorps-bot/Pinball
- Source commit: 3a4d9b3996ad339a4daeed9c301d8d0c3fbac5db
- Card: DRA-3958
- Build: `npm ci` then `npm run build` at that commit (Vite, then `scripts/inline-dist.mjs`)
- Pages delta from that build: one local favicon link (`assets/icon-key-YfThh_Bm.png`) so the browser does not request the organization icon. Same fix as DRA-3863.

This repository is the built page and its image files. Press 1 to start a one-player game. Z and / are the flippers, Space launches, and M mutes the music. H, or the High scores button, opens the local high-score list in the journal on a desktop and in the top strip on a phone, so it does not cover the table.
