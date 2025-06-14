// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // أضفت الإيميل هنا بناءً على استخدامك له في الـ routes
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    playerCoins: { type: Number, default: 500 },
    luckyPoints: { type: Number, default: 0 },
    roundsPlayed: { type: Number, default: 0 },
    personalScores: [{ // تخزين النتائج الفردية
        round: { type: Number }, // يجب تحديد النوع هنا
        score: { type: Number }, // أضفت score هنا ليتناسب مع تخزين نتائج الجولات
        prize: { type: String },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true }); // أضفت timestamps لتتبع وقت الإنشاء والتحديث

// تشفير كلمة المرور قبل حفظ المستخدم
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) { // تحقق مما إذا تم تعديل كلمة المرور فقط
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// طريقة لمقارنة كلمة المرور المدخلة مع كلمة المرور المشفرة
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// هذا السطر حاسم: تصدير نموذج المستخدم
module.exports = mongoose.models.User || mongoose.model('User', userSchema);