const { google } = require("googleapis");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const fileId = event.queryStringParameters.fileId; // Extract fileId from query

    if (!fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "fileId is required" }),
      };
    }

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

    await drive.files.delete({
      fileId: fileId,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "File deleted successfully",
      }),
    };
  } catch (error) {
    console.error("Error deleting file:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Error deleting file",
        error: error.message,
      }),
    };
  }
};
