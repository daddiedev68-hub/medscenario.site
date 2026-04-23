
const mongoose = require('mongoose');

const uri = "mongodb+srv://daddiedev71_db_user:daddienew2001@cluster0.3vxqgqm.mongodb.net/medscenario";

console.log("Attempting to connect...");

mongoose.connect(uri)
  .then(() => {
    console.log("✅ SUCCESS! Connected to MongoDB!");
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ FAILED!");
    console.log("Error:", err.message);
    process.exit(1);
  });