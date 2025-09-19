import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Google Drive API setup
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth: oauth2Client });

// API Routes

// Get list of files
app.get("/api/files", async (req, res) => {
  try {
    const response = await drive.files.list({
      pageSize: 10,
      fields: "nextPageToken, files(id, name)",
      q: "'169ssbDPOs7T3RahvMB2gkaDr04KkuTyk' in parents",
    });

    res.json({
      success: true,
      files: response.data.files,
    });
  } catch (error) {
    console.error("Error listing files:", error.message);
    res.status(500).json({
      success: false,
      message: "Error listing files",
      error: error.message,
    });
  }
});

// Upload file
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const filePath = path.join(__dirname, req.file.path);

    const response = await drive.files.create({
      requestBody: {
        name: req.file.filename,
        mimeType: req.file.mimetype,
        parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"],
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath),
      },
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: response.data,
    });
  } catch (error) {
    console.error("Error uploading file:", error.message);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
});

// Delete file
app.delete("/api/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    await drive.files.delete({ fileId });

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
