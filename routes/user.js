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
            playerCoins: user.playerCoins, // تم التعديل
            luckyPoints: user.luckyPoints,   // تم التعديل
            roundsPlayed: user.roundsPlayed, // تم التعديل
            isAdmin: user.isAdmin
        });

        res.json({
            username: user.username,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// دالة مساعدة لمعالجة إجراءات اللعبة (مثل الضربات)
async function handleGameAction(req, res, actionType) {
    console.log(`Incoming Request: POST /api/user/${actionType}`); // سجل لكل نوع طلب
    const token = req.header('Authorization').replace('Bearer ', '');
    // تم حذف التحقق من التوكن هنا لأنه سيتم القيام به بواسطة authMiddleware

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error(`Error in ${actionType}: إعدادات اللعبة غير موجودة في قاعدة البيانات!`);
            return res.status(500).json({ message: 'Game settings not found' });
        }
        const settings = settingsDoc.value;

        let cost = 0;
        let prizeAmount = 0;
        let message = '';
        let prizeType = 'coins'; // الافتراضي هو العملات

        switch (actionType) {
            case 'auto-play':
                cost = settings.autoPlayCost || 100;
                prizeAmount = Math.floor(Math.random() * (settings.autoPlayMaxPrize || 20)) + 1; // جائزة عشوائية
                message = `لقد ربحت ${prizeAmount} عملة في اللعب التلقائي!`;
                break;
            case 'triple-strike':
                cost = settings.tripleStrikeCost || 150;
                // هنا يمكن أن يكون لديك منطق معقد لحساب الجوائز
                const isLuckyStrike = Math.random() < (settings.tripleStrikeLuckyChance || 0.1); // 10% فرصة لجائزة محظوظة
                if (isLuckyStrike) {
                    prizeAmount = settings.tripleHitPoints || 30; // نقاط ثابتة للضربة الثلاثية المحظوظة
                    message = `ضربة ثلاثية محظوظة! لقد ربحت ${prizeAmount} نقطة محظوظة!`;
                    prizeType = 'luckyPoints';
                } else {
                    prizeAmount = Math.floor(Math.random() * (settings.tripleStrikeMaxPrize || 30)) + 1;
                    message = `لقد ربحت ${prizeAmount} عملة في الضربة الثلاثية!`;
                }
                break;
            case 'hammer-strike':
                cost = settings.hammerStrikeCost || 200;
                prizeAmount = settings.hammerHitPoints || 50; // جائزة ثابتة للمطرقة
                message = `ضربة المطرقة! لقد ربحت ${prizeAmount} نقطة محظوظة!`;
                prizeType = 'luckyPoints';
                break;
            default:
                return res.status(400).json({ message: 'Invalid game action.' });
        }

        if (user.playerCoins < cost) {
            return res.status(400).json({ message: 'ليس لديك عملات كافية!' });
        }

        user.playerCoins -= cost; // خصم التكلفة

        if (prizeType === 'coins') {
            user.playerCoins += prizeAmount;
        } else if (prizeType === 'luckyPoints') {
            user.luckyPoints += prizeAmount;
        }

        // التأكد من عدم نزول العملات/النقاط عن الصفر
        if (user.playerCoins < 0) user.playerCoins = 0;
        if (user.luckyPoints < 0) user.luckyPoints = 0;

        user.roundsPlayed += 1;

        // إضافة تفاصيل الجولة إلى personalScores
        user.personalScores.push({
            round: user.roundsPlayed,
            score: prizeAmount, // هنا يمكن أن يكون score هو مقدار الربح/الخسارة في هذه الجولة
            prize: actionType, // نوع الإجراء كجائزة (للتتبع)
            date: new Date()
        });

        await user.save();

        res.json({
            message: message,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            prizeAmount: prizeAmount,
            prizeType: prizeType
        });

    } catch (err) {
        console.error(`Error in ${actionType}:`, err.message);
        res.status(500).json({ message: `Server error during ${actionType}`, error: err.message });
    }
}

// مسار لإعادة تعيين اللعبة (محمي)
router.post('/reset', authMiddleware, async (req, res) => {
    console.log('POST /api/user/reset: طلب إعادة تعيين اللعبة بدأ.');
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('POST /api/user/reset: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }

        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error('POST /api/user/reset: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found' });
        }
        const settings = settingsDoc.value;

        // إعادة تعيين الخصائص إلى قيمها الأولية من الإعدادات أو الافتراضية
        user.playerCoins = settings.initialCoins || 500; // استخدام قيمة افتراضية إذا لم تكن في الإعدادات
        user.luckyPoints = 0; // دائماً صفر عند إعادة التعيين
        user.roundsPlayed = 0; // دائماً صفر عند إعادة التعيين
        user.personalScores = []; // مسح السجل

        await user.save();
        console.log('POST /api/user/reset: تم إعادة تعيين بيانات المستخدم الفردي بنجاح.');

        res.json({
            message: 'تم إعادة تعيين اللعبة بنجاح!',
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin
        });

    } catch (err) {
        console.error('POST /api/user/reset: حدث خطأ أثناء إعادة تعيين اللعبة:', err.message);
        res.status(500).json({ message: 'Server error during game reset', error: err.message });
    }
});

// مسارات إجراءات اللعبة (محمية) - تستدعي handleGameAction
router.post('/auto-play', authMiddleware, (req, res) => handleGameAction(req, res, 'auto-play'));
router.post('/triple-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'triple-strike'));
router.post('/hammer-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'hammer-strike'));

module.exports = router;// backend/routes/user.js
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
            playerCoins: user.playerCoins, // تم التعديل
            luckyPoints: user.luckyPoints,   // تم التعديل
            roundsPlayed: user.roundsPlayed, // تم التعديل
            isAdmin: user.isAdmin
        });

        res.json({
            username: user.username,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// دالة مساعدة لمعالجة إجراءات اللعبة (مثل الضربات)
async function handleGameAction(req, res, actionType) {
    console.log(`Incoming Request: POST /api/user/${actionType}`); // سجل لكل نوع طلب
    const token = req.header('Authorization').replace('Bearer ', '');
    // تم حذف التحقق من التوكن هنا لأنه سيتم القيام به بواسطة authMiddleware

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error(`Error in ${actionType}: إعدادات اللعبة غير موجودة في قاعدة البيانات!`);
            return res.status(500).json({ message: 'Game settings not found' });
        }
        const settings = settingsDoc.value;

        let cost = 0;
        let prizeAmount = 0;
        let message = '';
        let prizeType = 'coins'; // الافتراضي هو العملات

        switch (actionType) {
            case 'auto-play':
                cost = settings.autoPlayCost || 100;
                prizeAmount = Math.floor(Math.random() * (settings.autoPlayMaxPrize || 20)) + 1; // جائزة عشوائية
                message = `لقد ربحت ${prizeAmount} عملة في اللعب التلقائي!`;
                break;
            case 'triple-strike':
                cost = settings.tripleStrikeCost || 150;
                // هنا يمكن أن يكون لديك منطق معقد لحساب الجوائز
                const isLuckyStrike = Math.random() < (settings.tripleStrikeLuckyChance || 0.1); // 10% فرصة لجائزة محظوظة
                if (isLuckyStrike) {
                    prizeAmount = settings.tripleHitPoints || 30; // نقاط ثابتة للضربة الثلاثية المحظوظة
                    message = `ضربة ثلاثية محظوظة! لقد ربحت ${prizeAmount} نقطة محظوظة!`;
                    prizeType = 'luckyPoints';
                } else {
                    prizeAmount = Math.floor(Math.random() * (settings.tripleStrikeMaxPrize || 30)) + 1;
                    message = `لقد ربحت ${prizeAmount} عملة في الضربة الثلاثية!`;
                }
                break;
            case 'hammer-strike':
                cost = settings.hammerStrikeCost || 200;
                prizeAmount = settings.hammerHitPoints || 50; // جائزة ثابتة للمطرقة
                message = `ضربة المطرقة! لقد ربحت ${prizeAmount} نقطة محظوظة!`;
                prizeType = 'luckyPoints';
                break;
            default:
                return res.status(400).json({ message: 'Invalid game action.' });
        }

        if (user.playerCoins < cost) {
            return res.status(400).json({ message: 'ليس لديك عملات كافية!' });
        }

        user.playerCoins -= cost; // خصم التكلفة

        if (prizeType === 'coins') {
            user.playerCoins += prizeAmount;
        } else if (prizeType === 'luckyPoints') {
            user.luckyPoints += prizeAmount;
        }

        // التأكد من عدم نزول العملات/النقاط عن الصفر
        if (user.playerCoins < 0) user.playerCoins = 0;
        if (user.luckyPoints < 0) user.luckyPoints = 0;

        user.roundsPlayed += 1;

        // إضافة تفاصيل الجولة إلى personalScores
        user.personalScores.push({
            round: user.roundsPlayed,
            score: prizeAmount, // هنا يمكن أن يكون score هو مقدار الربح/الخسارة في هذه الجولة
            prize: actionType, // نوع الإجراء كجائزة (للتتبع)
            date: new Date()
        });

        await user.save();

        res.json({
            message: message,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            prizeAmount: prizeAmount,
            prizeType: prizeType
        });

    } catch (err) {
        console.error(`Error in ${actionType}:`, err.message);
        res.status(500).json({ message: `Server error during ${actionType}`, error: err.message });
    }
}

// مسار لإعادة تعيين اللعبة (محمي)
router.post('/reset', authMiddleware, async (req, res) => {
    console.log('POST /api/user/reset: طلب إعادة تعيين اللعبة بدأ.');
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('POST /api/user/reset: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }

        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error('POST /api/user/reset: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found' });
        }
        const settings = settingsDoc.value;

        // إعادة تعيين الخصائص إلى قيمها الأولية من الإعدادات أو الافتراضية
        user.playerCoins = settings.initialCoins || 500; // استخدام قيمة افتراضية إذا لم تكن في الإعدادات
        user.luckyPoints = 0; // دائماً صفر عند إعادة التعيين
        user.roundsPlayed = 0; // دائماً صفر عند إعادة التعيين
        user.personalScores = []; // مسح السجل

        await user.save();
        console.log('POST /api/user/reset: تم إعادة تعيين بيانات المستخدم الفردي بنجاح.');

        res.json({
            message: 'تم إعادة تعيين اللعبة بنجاح!',
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin
        });

    } catch (err) {
        console.error('POST /api/user/reset: حدث خطأ أثناء إعادة تعيين اللعبة:', err.message);
        res.status(500).json({ message: 'Server error during game reset', error: err.message });
    }
});

// مسارات إجراءات اللعبة (محمية) - تستدعي handleGameAction
router.post('/auto-play', authMiddleware, (req, res) => handleGameAction(req, res, 'auto-play'));
router.post('/triple-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'triple-strike'));
router.post('/hammer-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'hammer-strike'));

module.exports = router;