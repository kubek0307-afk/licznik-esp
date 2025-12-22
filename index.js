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
const USER_CODE  = process.env.ACCESS_CODE || "kutas";
const ADMIN_CODE = process.env.ADMIN_CODE || "kutasadmin";
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
  params: {
    folder: "licznik",
    format: "jpg",
    transformation: [
      { width: 1600, crop: "limit" },
      { quality: "auto:eco" }
    ]
  }
});
const upload = multer({ storage });

/* ===== DB ===== */
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB połączone"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* ===== MODELE ===== */
const Entry = mongoose.model("Entry", new mongoose.Schema({
  type: String,
  title: String,
  text: String,
  image: String,
  gallery: [String],
  date: String,
  location: { lat: Number, lng: Number }
}));

const Counter = mongoose.model("Counter", new mongoose.Schema({
  lysy: Number,
  pawel: Number,
  poprawa: Number
}));

/* ===== INIT LICZNIK ===== */
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

/* ===== UTILS ===== */
function getPublicId(url){
  const p = url.split("/");
  return p[p.length - 1].split(".")[0];
}

/* ===== API DATA ===== */
app.get("/api/data", auth, async (req, res) => {
  const counter = await Counter.findOne();
  const history = await Entry.find().sort({ _id: -1 });
  res.json({ counter, history, isAdmin: req.isAdmin });
});

/* ===== ADD POST ===== */
app.post(
  "/api/add",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const { type, title, text, lat, lng } = req.body;
      const counter = await Counter.findOne();

      if (!["lysy", "pawel", "poprawa"].includes(type))
        return res.status(400).json({ error: "Wrong type" });

      counter[type]++;
      await counter.save();

      const entry = await Entry.create({
        type,
        title: title || "",
        text: text || "",
        image: req.files.image ? req.files.image[0].path : null,
        gallery: req.files.gallery ? req.files.gallery.map(f => f.path) : [],
        date: new Date().toLocaleString("pl-PL"),
        location: lat && lng ? { lat, lng } : null
      });

      res.json({ ok: true, entry });
    } catch (e) {
      console.error("ADD ERROR:", e);
      res.status(500).json({ error: "add failed" });
    }
  }
);

/* ===== DELETE POST (ADMIN) ===== */
app.delete("/api/post/:id", auth, async (req, res) => {
  try {
    if (!req.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const post = await Entry.findById(req.params.id);
    if (!post) return res.json({ ok: true });

    const counter = await Counter.findOne();
    if (post.type === "lysy") counter.lysy = Math.max(0, counter.lysy - 1);
    if (post.type === "pawel") counter.pawel = Math.max(0, counter.pawel - 1);
    if (post.type === "poprawa") counter.poprawa = Math.max(0, counter.poprawa - 1);
    await counter.save();

    if (post.image)
      await cloudinary.uploader.destroy(getPublicId(post.image));

    if (post.gallery)
      for (const img of post.gallery)
        await cloudinary.uploader.destroy(getPublicId(img));

    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE ERROR:", e);
    res.status(500).json({ error: "delete failed" });
  }
});

/* ===== RESET LICZNIKÓW (ADMIN) ===== */
app.post("/api/reset", auth, async (req, res) => {
  try {
    if (!req.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    await Counter.updateMany({}, {
      lysy: 0,
      pawel: 0,
      poprawa: 0
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("RESET ERROR:", e);
    res.status(500).json({ error: "reset failed" });
  }
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Server działa na porcie " + PORT)
);
