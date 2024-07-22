const express = require("express");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const moment = require("moment");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

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

//http://localhost:5000/send-otp?phone=254700000000  - sample endpoint
// Sending OTP via Whatsapp
app.get("/send-otp", async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).send("Phone number is required");
  }

  const otp = generateOTP();
  //set expire time to 2 minutes after otp generation
  const expiresAt = moment().add(2, "minutes").format("YYYY-MM-DD HH:mm:ss");

  try {
    await db.query(
      "INSERT INTO otps (phone, otp, expires_at) VALUES (?, ?, ?)",
      [phone, otp, expiresAt]
    );

    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: `whatsapp:+14155238886`,
      to: `whatsapp:${phone}`,
    });

    res.send(`OTP sent to ${phone}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send OTP");
  }
});

//http://localhost:5000/verify-otp?phone=254700000000&otp=820951    -   sample endpoint
// Endpoint to verify OTP
app.get("/verify-otp", async (req, res) => {
  const { phone, otp } = req.query;
  if (!phone || !otp) {
    return res.status(400).send("Phone number and OTP are required");
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM otps WHERE phone = ? AND otp = ? AND expires_at > NOW()",
      [phone, otp]
    );

    if (rows.length > 0) {
      //delete a successfully verified otp
      await db.query("DELETE FROM otps WHERE phone = ? AND otp = ?", [
        phone,
        otp,
      ]);
      res.send("OTP verified successfully");
    } else {
      //Delete all expired otps to avoid junk in the database
      await db.query("DELETE FROM otps WHERE expires_at < NOW()");
      res.status(400).send("Invalid or expired OTP");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to verify OTP");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
