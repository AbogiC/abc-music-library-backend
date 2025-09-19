const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // Set headers for CORS
  const headers = {
    "Access-Control-Allow-Origin": "*", // ✅ restrict to your domain
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
    const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    const oauth2Client = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const { token: accessToken } = await oauth2Client.getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=nextPageToken,files(id,name)&q='169ssbDPOs7T3RahvMB2gkaDr04KkuTyk' in parents`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        files: data.files,
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
