import fs from "fs";
import path from "path";
import os from "os";

export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const { google } = await import("googleapis");

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

    // Decode body if base64
    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(body, "base64").toString("binary");
    }

    // Parse multipart form data
    const boundary = event.headers["content-type"].split("boundary=")[1];
    const parts = body.split(`--${boundary}`);
    let fileBuffer = null;
    let fileName = "";
    let mimeType = "";

    for (const part of parts) {
      if (part.includes("Content-Disposition")) {
        const contentDisposition = part.split("\r\n")[1];
        if (contentDisposition.includes("filename=")) {
          fileName = contentDisposition.split("filename=")[1].replace(/"/g, "");
          mimeType = part.split("Content-Type: ")[1].split("\r\n")[0];
          const content = part.split("\r\n\r\n")[1].split("\r\n--")[0];
          fileBuffer = Buffer.from(content, "binary");
        }
      }
    }

    if (!fileBuffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "No file uploaded",
        }),
      };
    }

    // Write to temp file
    const tempPath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tempPath, fileBuffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"],
      },
      media: {
        mimeType: mimeType,
        body: fs.createReadStream(tempPath),
      },
    });

    // Clean up
    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "File uploaded successfully",
        file: response.data,
      }),
    };
  } catch (error) {
    console.error("Error uploading file:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Error uploading file",
        error: error.message,
      }),
    };
  }
};
