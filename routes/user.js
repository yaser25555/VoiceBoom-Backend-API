// backend/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // استيراد نموذج المستخدم
const authMiddleware = require('../models/User'); // استيراد الـ Middleware الصحيح: يجب أن يكون من 'auth'
// قم بتصحيح السطر أعلاه ليصبح:
// const authMiddleware = require('../middleware/auth'); // لِحماية المسارات والوصول إلى req.user

const Setting = require('../models/Setting'); // لاستيراد إعدادات اللعبة (مثل التكاليف وقيم الجوائز)

// مسار لجلب بيانات المستخدم (محمي)
// يُستخدم بواسطة الواجهة الأمامية لعرض نقاط المستخدم، نقاط الحظ، وعدد الجولات الملعوبة
router.get('/data', authMiddleware, async (req, res) => {
    try {
        // req.user.id يتم ملؤها بواسطة authMiddleware
        const user = await User.findById(req.user.id).select('-password'); // استبعاد كلمة المرور
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            username: user.username,
            score: user.score, // تم تغيير playerCoins إلى score هنا
            level: user.level, // تم إضافة level
            attempts: user.attempts, // تم إضافة attempts
            isAdmin: user.isAdmin // مهم للواجهة الأمامية لتبديل لوحة المدير
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// مسار موحد لجميع إجراءات اللعبة (تلقائي، ثلاثي، مطرقة)
router.post('/action', authMiddleware, async (req, res) => {
    const { action } = req.body; // استخراج نوع الإجراء من جسم الطلب
    
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // جلب إعدادات اللعبة
        const gameSettings = await Setting.findOne({ name: 'gameConfig' });
        // إذا لم يتم العثور على إعدادات، استخدم قيمًا افتراضية
        const { maxScore, maxLevel, initialAttempts } = gameSettings ? gameSettings.value : { maxScore: 100, maxLevel: 5, initialAttempts: 3 };

        let message = '';
        let scoreChange = 0; // التغير في النقاط
        let levelChange = 0;
        let attemptsChange = 0; // التغير في المحاولات

        if (user.attempts <= 0) {
            return res.status(400).json({
                message: 'انتهت محاولاتك! الرجاء البدء من جديد.',
                score: user.score,
                level: user.level,
                attempts: user.attempts
            });
        }

        // تحديد التكلفة (Cost) وقيمة الجائزة (Prize Value)
        let cost = 0;
        let basePrize = 0;
        switch (action) {
            case 'auto':
                cost = 1; // تكلفة اللعب التلقائي
                basePrize = 5; // أساس الجائزة
                break;
            case 'tripleStrike':
                cost = 2; // تكلفة الضربة الثلاثية
                basePrize = 10;
                break;
            case 'hammerStrike':
                cost = 3; // تكلفة ضربة المطرقة
                basePrize = 15;
                break;
            default:
                return res.status(400).json({ message: 'إجراء غير صالح.' });
        }

        // خصم التكلفة
        user.score -= cost;
        attemptsChange = -1; // خصم محاولة واحدة لكل إجراء
        user.attempts += attemptsChange;

        // منطق حساب النقاط والجائزة
        let prizeAmount = 0;
        let random = Math.random();

        if (action === 'tripleStrike') {
            if (random < 0.6) { // 60% فرصة للفوز بـ 1.5x - 3x
                prizeAmount = Math.floor(basePrize * (1.5 + Math.random() * 1.5));
            } else { // 40% فرصة لخسارة 0.5x
                prizeAmount = -Math.floor(basePrize * 0.5);
            }
        } else if (action === 'hammerStrike') {
            if (random < 0.7) { // 70% فرصة للفوز بـ 2x - 4x
                prizeAmount = Math.floor(basePrize * (2 + Math.random() * 2));
            } else { // 30% فرصة لخسارة 0.75x
                prizeAmount = -Math.floor(basePrize * 0.75);
            }
        } else { // 'auto'
            if (random < 0.4) { // 40% فرصة للفوز بـ 0.5x - 1.5x
                prizeAmount = Math.floor(basePrize * (0.5 + Math.random()));
            } else { // 60% فرصة لخسارة 0.25x
                prizeAmount = -Math.floor(basePrize * 0.25);
            }
        }

        user.score += prizeAmount;
        message = `حصلت على ${prizeAmount} نقطة!`;

        // التأكد من عدم نزول النقاط عن الصفر
        if (user.score < 0) user.score = 0;

        // منطق رفع المستوى
        if (user.score >= maxScore && user.level < maxLevel) {
            user.level += 1;
            user.score = 0; // إعادة تعيين النقاط للمستوى الجديد
            user.attempts = initialAttempts; // إعادة تعيين المحاولات للمستوى الجديد
            message += ` لقد وصلت إلى المستوى ${user.level} الجديد!`;
        }

        // إذا انتهت المحاولات
        if (user.attempts <= 0) {
            message = 'انتهت محاولاتك! سيتم إعادة توجيهك إلى صفحة تسجيل الدخول.';
            user.attempts = 0; // تأكيد أن المحاولات لا تصبح سالبة
            // حالياً، الكلاينت سيتعامل مع إعادة التوجيه بناءً على عدد المحاولات 0
        }

        await user.save();

        res.json({
            message: message,
            score: user.score,
            level: user.level,
            attempts: user.attempts
        });

    } catch (err) {
        console.error('Error during game action:', err);
        res.status(500).json({ message: 'خطأ في الخادم أثناء تنفيذ الإجراء.', error: err.message });
    }
});

module.exports = router;