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
        const user = await User.findById(req.user.id).select('-password');
        
        console.log('GET /api/user/data: تم جلب المستخدم من قاعدة البيانات.');
        if (!user) {
            console.log('GET /api/user/data: المستخدم غير موجود (404).');
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log('GET /api/user/data: بيانات المستخدم جاهزة للإرسال:', {
            username: user.username,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
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

// دالة مساعدة لعمليات اللعب
async function handleGameAction(req, res, actionType) {
    console.log(`POST /api/user/${actionType}: طلب بدأ.`);
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log(`POST /api/user/${actionType}: المستخدم غير موجود (404).`);
            return res.status(404).json({ message: 'User not found' });
        }

        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error(`POST /api/user/${actionType}: إعدادات اللعبة غير موجودة في قاعدة البيانات!`);
            return res.status(500).json({ message: 'Game settings not found or invalid' });
        }
        const settings = settingsDoc.value; // الوصول إلى كائن الإعدادات الفعلية

        let message = '';
        let prizeAmount = 0;
        let prizeType = 'coins'; // الافتراضي هو عملات
        let cost = 0;

        switch (actionType) {
            case 'auto-play':
                cost = settings.autoPlayCost || 20;
                if (user.playerCoins < cost) {
                    return res.status(400).json({ message: 'لا يوجد لديك عملات كافية للعب التلقائي!', playerCoins: user.playerCoins, luckyPoints: user.luckyPoints, roundsPlayed: user.roundsPlayed });
                }
                user.playerCoins -= cost;
                prizeAmount = Math.floor(Math.random() * (settings.autoPlayRewardMax - settings.autoPlayRewardMin + 1)) + settings.autoPlayRewardMin;
                user.playerCoins += prizeAmount;
                message = `لعب تلقائي: فزت بـ ${prizeAmount} عملة!`;
                break;

            case 'triple-strike':
                cost = settings.tripleStrikeCost || 30;
                if (user.playerCoins < cost) {
                    return res.status(400).json({ message: 'لا يوجد لديك عملات كافية للضربة الثلاثية!', playerCoins: user.playerCoins, luckyPoints: user.luckyPoints, roundsPlayed: user.roundsPlayed });
                }
                user.playerCoins -= cost;
                prizeAmount = settings.tripleStrikeReward || 100;
                user.playerCoins += prizeAmount;
                message = `ضربة ثلاثية: فزت بـ ${prizeAmount} عملة!`;
                break;

            case 'hammer-strike':
                cost = settings.hammerStrikeCost || 5; // تكلفة نقاط الحظ
                if (user.luckyPoints < cost) {
                    return res.status(400).json({ message: 'لا يوجد لديك نقاط حظ كافية لضربة المطرقة!', playerCoins: user.playerCoins, luckyPoints: user.luckyPoints, roundsPlayed: user.roundsPlayed });
                }
                user.luckyPoints -= cost;
                prizeAmount = settings.hammerStrikeReward || 500;
                user.playerCoins += prizeAmount;
                message = `ضربة المطرقة: فزت بـ ${prizeAmount} عملة ضخمة!`;
                break;

            default:
                return res.status(400).json({ message: 'نوع الإجراء غير صالح.' });
        }

        // التأكد من عدم نزول العملات/النقاط عن الصفر
        if (user.playerCoins < 0) user.playerCoins = 0;
        if (user.luckyPoints < 0) user.luckyPoints = 0;

        user.roundsPlayed += 1;

        // إضافة تفاصيل الجولة إلى personalScores
        user.personalScores.push({
            round: user.roundsPlayed,
            score: prizeAmount,
            prize: actionType,
            date: new Date()
        });

        await user.save();
        console.log(`POST /api/user/${actionType}: تم تحديث بيانات المستخدم بنجاح.`);

        res.json({
            message: message,
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            prizeAmount: prizeAmount,
            prizeType: prizeType // للاستخدام المستقبلي إذا لزم الأمر
        });

    } catch (err) {
        console.error(`Error in ${actionType}:`, err.message);
        res.status(500).json({ message: `Server error during ${actionType}`, error: err.message });
    }
}

// مسارات إجراءات اللعبة (محمية)
router.post('/auto-play', authMiddleware, (req, res) => handleGameAction(req, res, 'auto-play'));
router.post('/triple-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'triple-strike'));
router.post('/hammer-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'hammer-strike'));

// مسار لإعادة تعيين بيانات المستخدم الفردية (محمي)
// ملاحظة: هذا يختلف عن إعادة تعيين جميع المستخدمين في لوحة المدير
router.post('/reset', authMiddleware, async (req, res) => {
    console.log('POST /api/user/reset: طلب إعادة تعيين اللعبة الفردي بدأ.');
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

        // إعادة تعيين الخصائص إلى قيمها الأولية من الإعدادات
        user.playerCoins = settings.initialCoins || 500; // استخدام قيمة افتراضية إذا لم تكن في الإعدادات
        user.luckyPoints = 0;
        user.roundsPlayed = 0;
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
        console.error(err.message);
        res.status(500).json({ message: 'Server error during user reset', error: err.message });
    }
});

module.exports = router;