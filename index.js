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

// ======= STORAGE =======
let data = { lysy: 0, pawel: 0, history: [] };

if (fs.existsSync("db.json")) {
  data = JSON.parse(fs.readFileSync("db.json"));
}

function saveDB() {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// ======= UPLOAD =======
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ======= AUTH =======
function checkAccess(req, res, next) {
  const code = req.headers["access-code"] || req.body.accessCode;
  if (code !== ACCESS_CODE) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ======= API =======
app.get("/api/data", checkAccess, (req, res) => {
  res.json(data);
});

app.post("/api/add", checkAccess, upload.single("image"), (req, res) => {
  const { person, text } = req.body;

  if (person === "lysy") data.lysy++;
  if (person === "pawel") data.pawel++;

  let imgURL = null;
  if (req.file) imgURL = "/uploads/" + req.file.filename;

  data.history.unshift({
    person,
    text: text || "",
    img: imgURL,
    date: new Date().toLocaleString()
  });

  saveDB();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Server running on port " + PORT)
);
