Pair-site-UI (Money Heist MD) - Pair Code Generator with HTML/CSS UI
=================================================================

Files:
 - package.json
 - pair.js
 - public/index.html
 - public/style.css
 - .env.example
 - README.md

Quick start (local):
1. Copy .env.example -> .env and set PAIR_KEY if desired.
2. npm install
3. npm start
4. Open http://localhost:5000 and use the form to request a pair code.

Notes:
 - Use Render, Railway, Replit, or a VPS to deploy. Vercel serverless not recommended for long-lived sockets.
 - After pairing, a DILALK/ folder will be created containing session credentials. Download and copy it to your bot repo.
 - Keep credentials private.
