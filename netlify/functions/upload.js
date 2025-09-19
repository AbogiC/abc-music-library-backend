const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const os = require("os");

exports.handler = async (event, context) => {
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

    // Create multipart body
    const uploadBoundary =
      "boundary_" + Math.random().toString(36).substr(2, 9);
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"],
    };

    let uploadBody = `--${uploadBoundary}\r\n`;
    uploadBody += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    uploadBody += JSON.stringify(metadata) + "\r\n";
    uploadBody += `--${uploadBoundary}\r\n`;
    uploadBody += `Content-Type: ${mimeType}\r\n\r\n`;
    uploadBody += fileBuffer.toString("binary") + "\r\n";
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
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const response = await uploadResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "File uploaded successfully",
        file: response,
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
