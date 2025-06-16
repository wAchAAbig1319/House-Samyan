const fetch = require("node-fetch");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;


// เสิร์ฟไฟล์ static จาก path เดียวกับ proxy.js
app.use(express.static(__dirname));
app.use(express.json());

// Middleware สำหรับ CORS และ log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Proxy API ไปยัง House Samyan
app.post("/api/schedule", async (req, res) => {
  try {
    const { search_date, language } = req.body;

    console.log("📩 Request received with:", { search_date, language });

    const body = new URLSearchParams({
      search_date,
      token: "",
      language
    });

    console.log("🔁 Forwarding to remote API with body:", body.toString());

    const response = await fetch("https://www.housesamyan.com/houseapi/showtimes/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic SG91c2VWc1NtYXJ0Q2xpY2s6"
      },
      body,
    });

    const text = await response.text(); // ⚠️ ไม่ใช้ .json() ทันที เพื่อดู error จากฝั่งโน้น
    console.log("📥 Response from remote API:", response.status, text);

    if (!response.ok) {
      return res.status(500).json({ error: "Remote API error", response: text });
    }

    res.send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/test.html`);
});
