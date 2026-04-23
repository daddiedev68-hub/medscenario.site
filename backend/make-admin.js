
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

async function makeAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // YOUR EMAIL HERE
        const yourEmail = "daddiedev71@gmail.com";
        
        const result = await User.updateOne(
            { email: yourEmail },
            { isAdmin: true }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ User ${yourEmail} is now an ADMIN!`);
        } else if (result.matchedCount > 0) {
            console.log(`✅ User ${yourEmail} is already an admin!`);
        } else {
            console.log(`❌ User with email ${yourEmail} not found. Make sure you registered first.`);
        }
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit();
    }
}

makeAdmin();