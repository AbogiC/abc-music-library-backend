const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
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
    const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    const oauth2Client = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const { token: accessToken } = await oauth2Client.getAccessToken();

    const deleteResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete file: ${deleteResponse.statusText}`);
    }

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
