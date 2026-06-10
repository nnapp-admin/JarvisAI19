const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function loadDotEnv() {
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}

loadDotEnv();

const config = {
  OPENROUTER_KEY: process.env.OPENROUTER_API_KEY || "",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
  ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID || "",
  ELEVENLABS_VOICE: process.env.ELEVENLABS_VOICE_ID || "TxGEqnHWrfWFTfGW9XjX",
};

const out = path.join(root, "js", "config.js");
const body =
  "/* Generated at build time — do not edit. */\n" +
  "window.JARVIS_CONFIG = " +
  JSON.stringify(config, null, 2) +
  ";\n";

fs.writeFileSync(out, body, "utf8");
console.log("Wrote js/config.js (keys present: " +
  Object.keys(config).filter(function (k) { return config[k]; }).join(", ") + ")");
