// pair.js - CommonJS version
const express = require("express");
const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment-timezone");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  Browsers,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 5000;
const PAIR_KEY = process.env.PAIR_KEY || "";
const log = pino({ level: "info" });

app.get("/", (req, res) => {
  res.send(`
  <center style="font-family:system-ui">
    <h2>🤖 MONEY HEIST MD – Pair Code Generator</h2>
    <form action="/pair" method="get">
      <label>Enter your WhatsApp number (e.g. 9477XXXXXXX):</label><br>
      <input name="number" placeholder="94771234567" required style="padding:10px;margin:10px;width:250px"/><br>
      ${PAIR_KEY ? '<input name="key" placeholder="Enter key" required style="padding:10px;margin:10px;width:250px"/><br>' : ""}
      <button type="submit" style="padding:10px 20px;background:#007b00;color:#fff;border:none;border-radius:6px">
        Get Pair Code
      </button>
    </form>
    <p style="font-size:13px;color:gray;">Keep this page open while pairing.</p>
  </center>
  `);
});

app.get("/pair", async (req, res) => {
  const number = (req.query.number || "").replace(/\D/g, "");
  const key = req.query.key;

  if (!number) return res.send("Invalid number.");
  if (PAIR_KEY && key !== PAIR_KEY) return res.send("Invalid access key 🔒");

  try {
    const sessionDir = "./DILALK";
    await fs.ensureDir(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.macOS("Safari"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
      }
    });

    sock.ev.on("creds.update", saveCreds);

    const code = await sock.requestPairingCode(number);
    console.log(`📱 Pairing code for ${number}: ${code}`);

    res.send(`
      <center style="font-family:system-ui">
        <h3>🔑 Your Pair Code for ${number}</h3>
        <h1 style="font-size:45px;color:#0a0;">${code}</h1>
        <p>Open WhatsApp > Linked Devices > Link with phone number > Enter this code</p>
        <hr style="margin:20px 0">
        <p style="color:gray">Once linked, a message will be sent to your WhatsApp automatically.</p>
      </center>
    `);

    sock.ev.on("connection.update", async (update) => {
      if (update.connection === "open") {
        console.log("✅ Connected to WhatsApp.");
        await delay(3000);

        const aiquoted = {
          key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "FAKE_MSG_001",
            participant: "94777839446@s.whatsapp.net"
          },
          message: {
            contactMessage: {
              displayName: "ᴍᴏɴᴇʏ ʜᴇɪꜱᴛ ᴍᴅ ✓",
              vcard: `BEGIN:VCARD
VERSION:3.0
FN:Dila
TEL;waid=13135550002:+1 313 555 0002
END:VCARD`
            }
          }
        };

        const interactiveButtons = [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Visit Our Site 🌐",
              url: "https://www.freebots.store/"
            })
          }
        ];

        const message = {
          image: { url: "https://github.com/monetheistmd/WEB_DATABASE/raw/main/Media/Image/OwnerMenu.jpg" },
          caption: `✅ *Successfully Linked!*\n\nWelcome to *MONEY HEIST MD Bot* 🎭\n\nYour device has been paired successfully.\n\n⏱️ Wait about 1–2 minutes for your bot to activate.\n\n💡 Visit: www.freebots.store`,
          footer: "© MONEY HEIST MD™",
          title: "MONEY HEIST LINK SUCCESS ✅",
          interactiveButtons
        };

        await sock.sendMessage(sock.user.id, message, { quoted: aiquoted });

        console.log("📨 Message sent to paired device.");

        await delay(5000);
        try { await sock.ws.close(); } catch(e){}
        console.log("🔒 Connection closed, session saved.");
      }
    });

  } catch (err) {
    console.error("❌ Error:", err);
    if (!res.headersSent) res.send("Error generating pair code. Try again.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Pair site running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
