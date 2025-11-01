Pair-site (Money Heist MD) - Pair Code Generator
===============================================
Files:
  - package.json
  - pair.js
  - .env.example

Quick start (local):
  1. Copy .env.example -> .env and set PAIR_KEY if desired.
  2. npm install
  3. npm start
  4. Open http://localhost:5000 and enter your phone number to get pair code.

Deploy notes:
  - Render/Railway/Replit/VPS recommended. Vercel serverless is NOT suitable for long-running sockets (Baileys).
  - If you still try Vercel, see README warnings in the chat.

Security:
  - Keep DILALK folder private. Do not commit creds to public repos.
