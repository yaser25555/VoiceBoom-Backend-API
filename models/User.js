// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    totalScore: { type: Number, default: 0 }, // النقاط الكلية للمستخدم
    roundsPlayed: { type: Number, default: 0 }, // عدد الجولات التي لعبها

    // **أضف هذه الحقول الجديدة لعدد الضربات**
    autoPlayStrikes: { type: Number, default: 0 },
    tripleStrikes: { type: Number, default: 0 },
    hammerStrikes: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);