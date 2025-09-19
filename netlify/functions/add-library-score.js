const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin":
      "https://abc-music-library-cd1c3.firebaseapp.com", // ✅ restrict to your domain
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    const oauth2Client = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const { token: accessToken } = await oauth2Client.getAccessToken();

    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Decode body if base64
    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(body, "base64").toString("binary");
    }

    // Parse multipart form data
    const boundary = event.headers["content-type"].split("boundary=")[1];
    const parts = body.split(`--${boundary}`);
    let files = {};
    let formData = {};

    for (const part of parts) {
      if (part.includes("Content-Disposition")) {
        const lines = part.split("\r\n");
        const contentDisposition = lines[1];
        if (contentDisposition.includes("filename=")) {
          // File part
          const name = contentDisposition.split('name="')[1].split('"')[0];
          const filename = contentDisposition
            .split('filename="')[1]
            .split('"')[0];
          const mimeType = lines[2].split(": ")[1];
          const content = part.split("\r\n\r\n")[1].split("\r\n--")[0];
          const fileBuffer = Buffer.from(content, "binary");
          files[name] = { buffer: fileBuffer, filename, mimeType };
        } else if (contentDisposition.includes("name=")) {
          // Form field
          const name = contentDisposition.split('name="')[1].split('"')[0];
          const value = part.split("\r\n\r\n")[1].split("\r\n--")[0];
          formData[name] = value;
        }
      }
    }

    const pdfFile = files.filePDF;
    const audioFile = files.fileAudio;

    // Upload files to Google Drive
    let pdfIdDrive = null;
    let audioIdDrive = null;
    if (pdfFile) {
      const uploadBoundary =
        "boundary_" + Math.random().toString(36).substr(2, 9);
      const metadata = {
        name: pdfFile.filename,
        mimeType: pdfFile.mimeType,
        parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"],
      };

      let uploadBody = `--${uploadBoundary}\r\n`;
      uploadBody += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
      uploadBody += JSON.stringify(metadata) + "\r\n";
      uploadBody += `--${uploadBoundary}\r\n`;
      uploadBody += `Content-Type: ${pdfFile.mimeType}\r\n\r\n`;
      uploadBody += pdfFile.buffer.toString("binary") + "\r\n";
      uploadBody += `--${uploadBoundary}--\r\n`;

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${uploadBoundary}`,
          },
          body: uploadBody,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`PDF upload failed: ${uploadResponse.statusText}`);
      }

      const response = await uploadResponse.json();
      pdfIdDrive = `${response.id}`;
    }
    if (audioFile) {
      const uploadBoundary =
        "boundary_" + Math.random().toString(36).substr(2, 9);
      const metadata = {
        name: audioFile.filename,
        mimeType: audioFile.mimeType,
        parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"],
      };

      let uploadBody = `--${uploadBoundary}\r\n`;
      uploadBody += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
      uploadBody += JSON.stringify(metadata) + "\r\n";
      uploadBody += `--${uploadBoundary}\r\n`;
      uploadBody += `Content-Type: ${audioFile.mimeType}\r\n\r\n`;
      uploadBody += audioFile.buffer.toString("binary") + "\r\n";
      uploadBody += `--${uploadBoundary}--\r\n`;

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${uploadBoundary}`,
          },
          body: uploadBody,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Audio upload failed: ${uploadResponse.statusText}`);
      }

      const response = await uploadResponse.json();
      audioIdDrive = `${response.id}`;
    }

    const { title, tags, composer, genre, difficulty_level, description } =
      formData;

    const sheetMusicData = {
      title,
      tags,
      composer,
      genre,
      difficulty_level,
      description,
      pdf: pdfIdDrive || pdfFile?.filename,
      audio: audioIdDrive || audioFile?.filename,
    };

    const docRef = await addDoc(collection(db, "sheet_music"), sheetMusicData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Uploaded successfully",
        data: docRef.id,
      }),
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message || "Failed to upload sheet music",
      }),
    };
  }
};
