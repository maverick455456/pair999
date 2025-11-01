import express from "express";
import cors from "cors";
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Phone number required" });

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./session/");
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({ auth: state, version, printQRInTerminal: false });

    const code = await sock.requestPairingCode(number);
    res.json({ pairCode: code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => console.log("✅ Backend running on 8080"));
