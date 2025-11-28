// server.js - Complete Backend Server for Browser Phone Calls
// Install dependencies: npm install express twilio cors dotenv body-parser

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

// Initialize Twilio client
const client = twilio(accountSid, authToken);
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public")); // Serve frontend files

// ============================================
// ENDPOINT: Generate Access Token
// ============================================
app.post("/api/token", (req, res) => {
  try {
    // Generate a random identity for the user
    const identity = req.body.identity || `user_${Date.now()}`;

    // Create an access token
    const token = new AccessToken(
      accountSid,
      process.env.TWILIO_API_KEY || accountSid,
      process.env.TWILIO_API_SECRET || authToken,
      { identity: identity },
    );

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    // Add the grant to the token
    token.addGrant(voiceGrant);

    // Serialize the token to a JWT string
    res.json({
      identity: identity,
      token: token.toJwt(),
    });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({
      error: "Failed to generate token",
      message: error.message,
    });
  }
});

// ============================================
// ENDPOINT: Handle Outgoing Calls (TwiML)
// ============================================
app.post("/api/voice", (req, res) => {
  try {
    const toNumber = req.body.To;
    const fromNumber = twilioPhoneNumber;

    // Create TwiML response
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Dial the number
    const dial = response.dial({
      callerId: fromNumber,
      record: "record-from-answer-dual", // Optional: record calls
      recordingStatusCallback: "/api/recording-status",
    });

    dial.number(toNumber);

    // Send TwiML response
    res.type("text/xml");
    res.send(response.toString());
  } catch (error) {
    console.error("Voice endpoint error:", error);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say("An error occurred. Please try again later.");

    res.type("text/xml");
    res.send(response.toString());
  }
});

// ============================================
// ENDPOINT: Handle Incoming Calls (Optional)
// ============================================
app.post("/api/incoming", (req, res) => {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Connect incoming call to the client
    const dial = response.dial();
    dial.client("browser_user"); // Connect to browser client

    res.type("text/xml");
    res.send(response.toString());
  } catch (error) {
    console.error("Incoming call error:", error);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say("Unable to connect your call.");

    res.type("text/xml");
    res.send(response.toString());
  }
});

// ============================================
// ENDPOINT: Call Status Callback
// ============================================
app.post("/api/call-status", (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  console.log(`Call ${callSid} status: ${callStatus}`);

  // Log call details
  console.log({
    from: req.body.From,
    to: req.body.To,
    duration: req.body.CallDuration,
    status: callStatus,
  });

  res.sendStatus(200);
});

// ============================================
// ENDPOINT: Recording Status Callback
// ============================================
app.post("/api/recording-status", (req, res) => {
  const recordingSid = req.body.RecordingSid;
  const recordingUrl = req.body.RecordingUrl;

  console.log(`Recording ${recordingSid} available at: ${recordingUrl}`);

  res.sendStatus(200);
});

// ============================================
// ENDPOINT: Get Call History
// ============================================
app.get("/api/call-history", async (req, res) => {
  try {
    const calls = await client.calls.list({
      limit: 20,
    });

    const callHistory = calls.map((call) => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      price: call.price,
      priceUnit: call.priceUnit,
    }));

    res.json(callHistory);
  } catch (error) {
    console.error("Call history error:", error);
    res.status(500).json({
      error: "Failed to retrieve call history",
      message: error.message,
    });
  }
});

// ============================================
// ENDPOINT: Health Check
// ============================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    twilio: {
      configured: !!(
        accountSid &&
        authToken &&
        twilioPhoneNumber &&
        twimlAppSid
      ),
    },
  });
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "An error occurred",
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Twilio configured: ${!!(accountSid && authToken)}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/token - Generate access token`);
  console.log(`  POST /api/voice - Handle outgoing calls`);
  console.log(`  POST /api/incoming - Handle incoming calls`);
  console.log(`  GET  /api/call-history - Get call history`);
  console.log(`  GET  /api/health - Health check`);
});

module.exports = app;
