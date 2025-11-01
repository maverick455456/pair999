import express from "express";
import makeWASocket, { useMultiFileAuthState, makeInMemoryStore, DisconnectReason } from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Missing phone number" });

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./DILALK");
    const sock = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      browser: ["Money-Heist-MD", "Chrome", "1.0.0"],
      logger: P({ level: "silent" })
    });

    let code;
    if (!sock.authState.creds.registered) {
      code = await sock.requestPairingCode(number);
    }

    sock.ev.on("creds.update", saveCreds);

    res.json({ code }); // ✅ send JSON response safely
  } catch (err) {
    console.error("Pair error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Pair Code Generator is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
