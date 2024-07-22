const express = require("express");
const twilio = require("twilio");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const moment = require("moment");
const { log } = require("console");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !twilioNumber) {
  console.error("Twilio credentials are not set in the environment variables");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.getConnection()
  .then((connection) => {
    console.log("Successfully connected to MySQL");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err.message);
    process.exit(1);
  });

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

app.get("/generate-otp", async (req, res) => {
  const otp = generateOTP();
  console.log("Generated OTP:", otp);
  res.send(`Generated OTP: ${otp}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
