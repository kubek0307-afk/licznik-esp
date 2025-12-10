const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const ACCESS_CODE = "kutas";

// ===== DANE W PAMIĘCI =====
let data = {
  lysy: 0,
  pawel: 0,
  history: []
};

// ===== WCZYTANIE Z PLIKU =====
if (fs.existsSync("db.json")) {
  data = JSON.parse(fs.readFileSync("db.json"));
}

function saveDB() {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// ===== UPLOAD ZDJĘĆ =====
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ===== AUTORYZACJA =====
function checkAccess(req, res, next) {
  const code = req.headers["access-code"] || req.body.accessCode;
  if (code !== ACCESS_CODE) {
    return res.status(403).json({ error: "Brak dostępu" });
  }
  next();
}

// ===== API =====

// POBIERANIE DANYCH
app.get("/api/data", checkAccess, (req, res) => {
  res.json(data);
});

// DODAWANIE WPISU
app.post("/api/add", checkAccess, upload.single("image"), (req, res) => {
  const { person, text } = req.body;

  if (!person) {
    return res.status(400).json({ error: "Brak osoby" });
  }

  if (person === "lysy") data.lysy++;
  if (person === "pawel") data.pawel++;

  const entry = {
    person,
    text: text || "",
    img: req.file ? "/uploads/" + req.file.filename : null,
    date: new Date().toLocaleString("pl-PL")
  };

  data.history.unshift(entry);
  saveDB();

  res.json({ ok: true, entry });
});

// ===== START SERWERA =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server działa na porcie " + PORT);
});
