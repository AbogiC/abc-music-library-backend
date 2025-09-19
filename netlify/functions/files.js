const { google } = require("googleapis");

exports.handler = async (event, context) => {
  // Set headers for CORS
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

  if (event.httpMethod !== "GET") {
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

    const response = await drive.files.list({
      pageSize: 10,
      fields: "nextPageToken, files(id, name)",
      q: "'169ssbDPOs7T3RahvMB2gkaDr04KkuTyk' in parents",
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        files: response.data.files,
      }),
    };
  } catch (error) {
    console.error("Error listing files:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Error listing files",
        error: error.message,
      }),
    };
  }
};
