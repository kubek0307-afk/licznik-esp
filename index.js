

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===== ENV ===== */
const ACCESS_CODE = process.env.ACCESS_CODE;
const MONGO_URI = process.env.MONGO_URI;

/* ===== CLOUDINARY ===== */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

/* ===== MULTER ===== */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "licznik",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 1280, crop: "limit" },
      { quality: "auto:good" }
    ]
  }
});
const upload = multer({ storage });

/* ===== DB ===== */
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB połączone"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* ===== MODELS ===== */
const Entry = mongoose.model("Entry", new mongoose.Schema({
  person: String,
  text: String,
  img: String,
  date: String
}));

const Counter = mongoose.model("Counter", new mongoose.Schema({
  lysy: Number,
  pawel: Number
}));

/* ===== INIT ===== */
(async () => {
  const c = await Counter.findOne();
  if (!c) await Counter.create({ lysy: 0, pawel: 0 });
})();

/* ===== AUTH ===== */
function checkAccess(req, res, next) {
  const code = req.headers["access-code"] || req.body.accessCode;
  if (code !== ACCESS_CODE) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* ===== API ===== */
app.get("/api/data", checkAccess, async (req, res) => {
  const counter = await Counter.findOne();
  const history = await Entry.find().sort({ _id: -1 }).limit(50);
  res.json({
    lysy: counter.lysy,
    pawel: counter.pawel,
    history
  });
});

app.post("/api/add", checkAccess, upload.single("image"), async (req, res) => {
  const { person, text } = req.body;

  const counter = await Counter.findOne();
  if (person === "lysy") counter.lysy++;
  if (person === "pawel") counter.pawel++;
  await counter.save();

  const entry = await Entry.create({
    person,
    text: text || "",
    img: req.file ? req.file.path : null,
    date: new Date().toLocaleString("pl-PL")
  });

  res.json({ ok: true, entry });
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server działa na porcie " + PORT));
