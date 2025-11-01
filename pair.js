// pair.js - Pair site with UI (CommonJS)
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
const PAIR_KEY = process.env.PAIR_KEY || '';

app.use(bodyParser.json());
app.use(express.static('public'));

function requireKey(req, res, next) {
  if (!PAIR_KEY) return next();
  const sent = (req.body && req.body.key) || req.query.key || '';
  if (sent && sent === PAIR_KEY) return next();
  return res.status(401).json({ error: 'Invalid key' });
}

app.post('/api/pair', requireKey, async (req, res) => {
  const { number } = req.body || {};
  if (!number || !/^[0-9]{6,15}$/.test(number)) return res.status(400).json({ error: 'Invalid number' });
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

    // respond immediately with code
    res.json({ code, msg: 'Enter code in WhatsApp Linked Devices → Pair with phone number' });

    // listen for connection complete and send welcome message
    sock.ev.on('connection.update', async (u) => {
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
              vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Dila\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD'
            }
          }
        };

        const msg = {
          image: { url: 'https://raw.githubusercontent.com/monetheistmd/WEB_DATABASE/main/Media/Image/OwnerMenu.jpg' },
          caption: '✅ Successfully Linked!\n\nWelcome to MONEY HEIST MD. Your device is paired.',
          footer: '© Money Heist MD',
        };

        try {
          await sock.sendMessage(sock.user.id, msg, { quoted: aiquoted });
          log.info('Welcome message sent');
        } catch (e) {
          log.error({ e }, 'Failed to send welcome message');
        }

        try { await delay(2000); await sock.ws.close(); } catch(e){}
        log.info('Socket closed after pairing (session saved)');
      } else if (u.connection === 'close') {
        log.info('Connection closed', u);
      }
    });

  } catch (err) {
    log.error({ err }, 'Pair error');
    if (!res.headersSent) res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  log.info(`Pair site UI running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
