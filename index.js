const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: "dfvezuwt6",
  api_key: "427148529627837",
  api_secret: "5v4lkLY2D-aajzg8MnyosrcYhDo"
});

const ACCESS_CODE = "kutas";

// 🔴 TU WSTAWIASZ SWOJE PRAWDZIWE HASŁO (PO ZMIANIE W ATLAS)
const MONGO_URI = "mongodb+srv://admin:kubatokox664@cluster0.lry9ftq.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB połączone"))
  .catch(err => console.error("❌ Błąd MongoDB:", err));

const EntrySchema = new mongoose.Schema({
  person: String,
  text: String,
  img: String,
  date: String
});

const CounterSchema = new mongoose.Schema({
  lysy: Number,
  pawel: Number
});

const Entry = mongoose.model("Entry", EntrySchema);
const Counter = mongoose.model("Counter", CounterSchema);

async function initCounter() {
  const count = await Counter.findOne();
  if (!count) {
    await Counter.create({ lysy: 0, pawel: 0 });
  }
}
initCounter();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

function checkAccess(req, res, next) {
  const code = req.headers["access-code"] || req.body.accessCode;
  if (code !== ACCESS_CODE)
    return res.status(403).json({ error: "Forbidden" });
  next();
}

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
    img: req.file ? "/uploads/" + req.file.filename : null,
    date: new Date().toLocaleString("pl-PL")
  });

  res.json({ ok: true, entry });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server działa na porcie " + PORT));
