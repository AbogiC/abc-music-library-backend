// netlify/functions/upload-to-drive.js
const { google } = require("googleapis");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
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
    const REDIRECT_URI = "https://developers.google.com/oauthplayground";
    const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Expect JSON body with { fileName, mimeType, base64 }
    const { fileName, mimeType, base64 } = JSON.parse(event.body);

    if (!fileName || !base64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: "Missing file data" }),
      };
    }

    const buffer = Buffer.from(base64, "base64");

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType,
        parents: ["169ssbDPOs7T3RahvMB2gkaDr04KkuTyk"], // change to your folder ID
      },
      media: {
        mimeType,
        body: buffer,
      },
    });

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
    console.error("Error uploading file:", error);
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
