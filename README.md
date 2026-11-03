# Pinball

Playable static build hosted for DirectiveDemos.

- Source repository: DranakCorps-bot/Pinball
- Source commit: 560e7a849fa9097e34e827047886856423772a83
- Card: DRA-3934
- Build: `npm ci` then `npm run build` at that commit (Vite, then `scripts/inline-dist.mjs`)
- Pages delta from that build: one local favicon link (`assets/icon-key-YfThh_Bm.png`) so the browser does not request the organization icon. Same fix as DRA-3863.

This repository is the built page and its image files. Press 1 to start a one-player game. Z and / are the flippers, Space launches, and M mutes the music.
