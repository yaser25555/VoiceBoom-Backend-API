// backend/models/Setting.js
const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    basePrize: {
        type: Number,
        default: 10
    },
    minAttempts: {
        type: Number,
        default: 1
    },
    maxAttempts: {
        type: Number,
        default: 10
    },
    levelUpBonus: {
        type: Number,
        default: 50
    },
    maxScore: {
        type: Number,
        default: 1000
    },
    maxLevel: {
        type: Number,
        default: 5
    },
    initialAttempts: {
        type: Number,
        default: 10
    },
    gameCost: {
        type: Number,
        default: 5 // تكلفة لعب جولة واحدة
    },
    autoPlayCost: {
        type: Number,
        default: 20 // تكلفة اللعب التلقائي
    },
    tripleStrikeCost: {
        type: Number,
        default: 30 // تكلفة Triple Strike
    },
    hammerStrikeCost: {
        type: Number,
        default: 5 // تكلفة Hammer Strike (تستخدم نقاط الحظ)
    },
    // <--- أضف هذه الحقول الجديدة هنا
    currentBackgroundUrl: { // مسار (URL) لخلفية اللعبة الحالية
        type: String,
        default: 'https://via.placeholder.com/1200x800/eeeeee/888888?text=Default_Background' // ضع هنا رابط الخلفية الافتراضية الخاصة بك
    },
    currentSoundUrl: { // مسار (URL) لملف الصوت الخلفي للعبة
        type: String,
        default: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // ضع هنا رابط ملف الصوت الافتراضي الخاص بك
    }
    // --->
});

// هذا يضمن أن يتم استخدام النموذج الحالي إذا كان موجوداً بالفعل
module.exports = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);