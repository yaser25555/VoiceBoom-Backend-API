// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // تم استيراده ولكن لا يتم استخدامه مباشرة في الموديل، يمكن حذفه إذا لم يكن هناك استخدام مستقبلي

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // أضفت حقل الإيميل هنا
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    playerCoins: { type: Number, default: 500 },
    luckyPoints: { type: Number, default: 0 },
    roundsPlayed: { type: Number, default: 0 },
    personalScores: [{ // تخزين النتائج الفردية
        round: { type: Number, required: true }, // يجب أن يكون له نوع وبيانات إلزامية
        score: { type: Number, required: true }, // أضفت حقل 'score' هنا
        prize: { type: String, default: 'None' }, // يجب أن يكون له نوع، وأضفت قيمة افتراضية
        date: { type: Date, default: Date.now } // أضفت تاريخ التسجيل لكل نتيجة
    }], // << هذا القوس المربع كان مفقوداً!
    // يمكنك إضافة حقول أخرى هنا إذا لزم الأمر
    lastLogin: { type: Date, default: Date.now } // مثال: لتتبع آخر دخول
}, { timestamps: true }); // timestamps: true يضيف createdAt و updatedAt تلقائيا

// يمكن إضافة هذه الدالة لتشفير كلمة المرور قبل الحفظ (Pre-save hook)
// إذا كنت تستخدم هذا، تأكد من إزالة منطق التشفير من auth.js لتجنب التكرار
/*
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});
*/

module.exports = mongoose.model('User', userSchema);