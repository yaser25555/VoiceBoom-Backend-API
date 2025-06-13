// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // حقل الإيميل أساسي للتسجيل والدخول
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    playerCoins: { type: Number, default: 500 },
    luckyPoints: { type: Number, default: 0 },
    roundsPlayed: { type: Number, default: 0 },
    personalScores: [{ // تخزين النتائج الفردية
        round: { type: Number, required: true },
        score: { type: Number, required: true },
        prize: { type: String, default: 'None' },
        date: { type: Date, default: Date.now }
    }],
    lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

// هذا السطر يمنع خطأ OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', userSchema);