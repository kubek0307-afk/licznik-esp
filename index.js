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
const USER_CODE  = process.env.ACCESS_CODE;   // kutas
const ADMIN_CODE = process.env.ADMIN_CODE;    // kutasadmin
const MONGO_URI  = process.env.MONGO_URI;

/* ===== CLOUDINARY ===== */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

/* ===== MULTER ===== */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "licznik",
    format: "jpg",
    transformation: [
      { width: 800, crop: "limit" },
      { quality: "auto:eco" }
    ]
  })
});
const upload = multer({ storage });

/* ===== DB ===== */
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB połączone"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* ===== MODELS ===== */
const Entry = mongoose.model("Entry", new mongoose.Schema({
  type: String,                 // lysy | pawel | poprawa
  text: String,
  img: String,
  date: String,
  location: { lat: Number, lng: Number }
}));

const Counter = mongoose.model("Counter", new mongoose.Schema({
  lysy: Number,
  pawel: Number,
  poprawa: Number
}));

/* ===== INIT ===== */
(async () => {
  const c = await Counter.findOne();
  if (!c) await Counter.create({ lysy: 0, pawel: 0, poprawa: 0 });
})();

/* ===== AUTH ===== */
function auth(req, res, next) {
  const code = req.headers["access-code"];
  if (code !== USER_CODE && code !== ADMIN_CODE)
    return res.status(403).json({ error: "Forbidden" });
  req.isAdmin = code === ADMIN_CODE;
  next();
}

/* ===== API ===== */
app.get("/api/data", auth, async (req, res) => {
  const counter = await Counter.findOne();
  const history = await Entry.find().sort({ _id: -1 }).limit(100);
  res.json({ counter, history, isAdmin: req.isAdmin });
});

/* ===== ADD ENTRY ===== */
app.post("/api/add", auth, upload.single("image"), async (req, res) => {
  try {
    const { type, text, lat, lng } = req.body;
    const counter = await Counter.findOne();

    if (!["lysy", "pawel", "poprawa"].includes(type))
      return res.status(400).json({ error: "Wrong type" });

    if (type === "lysy") counter.lysy++;
    if (type === "pawel") counter.pawel++;
    if (type === "poprawa") counter.poprawa++;

    await counter.save();

    const entry = await Entry.create({
      type,
      text: text || "",
      img: req.file ? req.file.path : null,
      date: new Date().toLocaleString("pl-PL"),
      location: lat && lng ? { lat, lng } : null
    });

    res.json({ ok: true, entry });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "add failed" });
  }
});

/* ===== DELETE (ADMIN) ===== */
app.delete("/api/delete/:id", auth, async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });
  await Entry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ===== RESET (ADMIN) ===== */
app.post("/api/reset", auth, async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });
  await Entry.deleteMany({});
  const counter = await Counter.findOne();
  counter.lysy = 0;
  counter.pawel = 0;
  counter.poprawa = 0;
  await counter.save();
  res.json({ ok: true });
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Server działa na porcie " + PORT)
);
