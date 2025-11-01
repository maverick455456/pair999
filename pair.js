// pair.js - Pair site UI without access key (only phone number required)
// WARNING: This version does NOT require an access key. Deploying publicly may allow others to request pair codes.
// Recommended: Deploy on private / temporary host, pair quickly, then remove the DILALK folder.

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  Browsers,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const app = express();
const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(bodyParser.json());
app.use(express.static('public'));

// POST /api/pair  { number: "9477..." }
app.post('/api/pair', async (req, res) => {
  const { number } = req.body || {};
  if (!number || !/^[0-9]{6,15}$/.test(String(number))) {
    return res.status(400).json({ error: 'Invalid number' });
  }
  const clean = String(number).replace(/\D/g, '');
  try {
    const sessionDir = './DILALK';
    await fs.ensureDir(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Safari'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    const code = await sock.requestPairingCode(clean);
    log.info({ number: clean, code }, 'pairing code generated');

    // respond with code to UI
    res.json({ code, msg: 'Enter code in WhatsApp Linked Devices → Pair with phone number' });

    // after pairing, send welcome message and close socket
    sock.ev.on('connection.update', async (u) => {
      try {
        if (u.connection === 'open') {
          log.info('Connected, sending welcome message to paired device');
          await delay(2500);

          const aiquoted = {
            key: {
              remoteJid: 'status@broadcast',
              fromMe: false,
              id: 'FAKE_001',
              participant: '94777839446@s.whatsapp.net'
            },
            message: {
              contactMessage: {
                displayName: 'MONEY HEIST MD',
                vcard: 'BEGIN:VCARD\\nVERSION:3.0\\nFN:Dila\\nTEL;waid=13135550002:+1 313 555 0002\\nEND:VCARD'
              }
            }
          };

          const msg = {
            image: { url: 'https://raw.githubusercontent.com/monetheistmd/WEB_DATABASE/main/Media/Image/OwnerMenu.jpg' },
            caption: '✅ Successfully Linked!\\n\\nWelcome to MONEY HEIST MD. Your device is paired.',
            footer: '© Money Heist MD',
          };

          try {
            await sock.sendMessage(sock.user.id, msg, { quoted: aiquoted });
            log.info('Welcome message sent');
          } catch (e) {
            log.error({ e }, 'Failed to send welcome message');
          }

          // give a short delay then close ws (session files saved)
          await delay(2000);
          try { await sock.ws.close(); } catch (e) {}
          log.info('Socket closed after pairing (session saved)');
        } else if (u.connection === 'close') {
          log.info('Connection closed', u);
        }
      } catch (ex) {
        log.error({ ex }, 'connection.update handler error');
      }
    });

  } catch (err) {
    log.error({ err }, 'Pair error');
    if (!res.headersSent) res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  log.info(`Pair site UI (no-key) running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
