require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');



const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect('mongodb://localhost:27017/tera-logic', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});



const fileSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  mimetype: String,
  size: Number,
  uploadDate: { type: Date, default: Date.now },
  customName: String,
});
const File = mongoose.model('File', fileSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + safeName);
  },
});

function fileFilter(req, file, cb) {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'image/jpg', 'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, text, or PDF files are allowed!'), false);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});


app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file type.' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Missing file name.' });
    }
    const file = new File({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      customName: name
    });
    await file.save();

  
    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/files', async (req, res) => {
  try {
    const files = await File.find().sort({ uploadDate: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/files/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    const file = await File.findOne({ customName: name });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const filePath = path.join(__dirname, 'uploads', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk.' });
    }
    res.download(filePath, file.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
}); 

