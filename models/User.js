const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    playerCoins: { type: Number, default: 500 },
    luckyPoints: { type: Number, default: 0 },
    roundsPlayed: { type: Number, default: 0 },
    personalScores: [{ // تخزين النتائج الفردية
        round: Number,
        prize: String,