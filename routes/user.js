// backend/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // استيراد نموذج المستخدم
const authMiddleware = require('../middleware/auth'); // لِحماية المسارات والوصول إلى req.user
const Setting = require('../models/Setting'); // لاستيراد إعدادات اللعبة (مثل التكاليف وقيم الجوائز)

// مسار لجلب بيانات المستخدم (محمي)
router.get('/data', authMiddleware, async (req, res) => {
    console.log('GET /api/user/data: الطلب بدأ.');
    try {
        // req.user.id يتم ملؤها بواسطة authMiddleware
        const user = await User.findById(req.user.id).select('-password');
        
        console.log('GET /api/user/data: تم جلب المستخدم من قاعدة البيانات.');
        if (!user) {
            console.log('GET /api/user/data: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log('GET /api/user/data: بيانات المستخدم جاهزة للإرسال:', {
            username: user.username,
            score: user.score,
            level: user.level,
            attempts: user.attempts,
            isAdmin: user.isAdmin
        });
        
        res.json({
            username: user.username,
            score: user.score,
            level: user.level,
            attempts: user.attempts,
            isAdmin: user.isAdmin
        });
    } catch (err) {
        console.error('GET /api/user/data: خطأ في الخادم:', err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// مسار لتنفيذ إجراءات اللعبة (تلقائي، ضربة ثلاثية، ضربة المطرقة)
router.post('/action', authMiddleware, async (req, res) => {
    const { action } = req.body;
    console.log(`POST /api/user/action: طلب إجراء اللعبة - ${action} بدأ.`);
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('POST /api/user/action: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }

        const settings = await Setting.findOne();
        if (!settings) {
            console.error('POST /api/user/action: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found' });
        }

        const { basePrize, minAttempts, maxAttempts, levelUpBonus, maxScore, maxLevel, initialAttempts } = settings;

        if (user.attempts <= 0) {
            console.log('POST /api/user/action: محاولات المستخدم انتهت.');
            return res.status(400).json({ message: 'No attempts left. Reset game or contact admin.' });
        }

        user.attempts -= 1; // خصم محاولة واحدة

        let prizeAmount = 0;
        let message = '';
        const random = Math.random();

        switch (action) {
            case 'auto':
                if (random < 0.4) { // 40% فرصة للفوز بـ 0.5x - 1x
                    prizeAmount = Math.floor(basePrize * (0.5 + Math.random() * 0.5));
                } else { // 60% فرصة لخسارة 0.2x
                    prizeAmount = -Math.floor(basePrize * 0.2);
                }
                break;
            case 'tripleStrike':
                if (random < 0.6) { // 60% فرصة للفوز بـ 1x - 2x
                    prizeAmount = Math.floor(basePrize * (1 + Math.random()));
                } else { // 40% فرصة لخسارة 0.3x
                    prizeAmount = -Math.floor(basePrize * 0.3);
                }
                break;
            case 'hammerStrike':
                if (random < 0.8) { // 80% فرصة للفوز بـ 1.5x - 3x
                    prizeAmount = Math.floor(basePrize * (1.5 + Math.random() * 1.5));
                } else { // 20% فرصة لخسارة 0.5x
                    prizeAmount = -Math.floor(basePrize * 0.5);
                }
                break;
            default:
                console.log('POST /api/user/action: إجراء غير صالح.');
                return res.status(400).json({ message: 'Invalid action type' });
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

        await user.save();
        console.log(`POST /api/user/action: تم حفظ بيانات المستخدم بنجاح. بيانات جديدة:`, {
            score: user.score, level: user.level, attempts: user.attempts
        });

        res.json({
            message: message,
            score: user.score,
            level: user.level,
            attempts: user.attempts,
            isAdmin: user.isAdmin
        });

    } catch (err) {
        console.error(`POST /api/user/action: خطأ في الخادم أثناء ${action}:`, err.message);
        res.status(500).json({ message: `Server error during ${action}`, error: err.message });
    }
});

// مسار لإعادة تعيين اللعبة (محمي)
router.post('/reset', authMiddleware, async (req, res) => {
    console.log('POST /api/user/reset: طلب إعادة تعيين اللعبة بدأ.');
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('POST /api/user/reset: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }

        const settings = await Setting.findOne();
        if (!settings) {
            console.error('POST /api/user/reset: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found' });
        }

        user.score = 0;
        user.level = 1;
        user.attempts = settings.initialAttempts; // إعادة تعيين المحاولات إلى القيمة الأولية من الإعدادات

        await user.save();
        console.log('POST /api/user/reset: تم إعادة تعيين بيانات المستخدم بنجاح.');

        res.json({
            message: 'تم إعادة تعيين اللعبة بنجاح!',
            score: user.score,
            level: user.level,
            attempts: user.attempts,
            isAdmin: user.isAdmin
        });

    } catch (err) {
        console.error('POST /api/user/reset: خطأ في الخادم أثناء إعادة تعيين اللعبة:', err.message);
        res.status(500).json({ message: 'Server error during game reset', error: err.message });
    }
});

module.exports = router;