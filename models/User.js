// backend/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const Setting = require('../models/Setting');

// مسار لجلب بيانات المستخدم (محمي)
router.get('/data', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            username: user.username,
            email: user.email, // أضف الإيميل إذا كنت تريد عرضه في الواجهة الأمامية
            playerCoins: user.playerCoins, // تم التحديث ليطابق نموذجك
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin
            // لا يوجد هنا score, level, attempts كما في النموذج السابق
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// دالة handleGameAction ستحتاج أيضاً إلى تعديل لتستخدم playerCoins بدلاً من score
// ونفس الشيء لـ luckyPoints و roundsPlayed إذا كانت تتعامل معها
async function handleGameAction(req, res, actionType) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const settings = await Setting.findOne();
        if (!settings) {
            console.error('POST /api/user/action: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found' });
        }

        let cost = 0;
        let prizeAmount = 0;
        let message = '';
        let prizeType = 'coins'; // افتراضي

        // التحقق من أن المستخدم لديه ما يكفي من العملات قبل اللعب
        if (actionType === 'auto-play') {
            cost = settings.autoPlayCost;
            if (user.playerCoins < cost) {
                return res.status(400).json({ message: 'ليس لديك ما يكفي من العملات للعب التلقائي.' });
            }
            user.playerCoins -= cost; // خصم التكلفة
            // منطق حساب الجائزة لـ auto-play (من الكود الذي قدمته سابقاً)
            const random = Math.random();
            if (random < 0.3) { // 30% فرصة للفوز باللعب التلقائي
                prizeAmount = Math.floor(settings.basePrize * (0.5 + Math.random())); // حتى 1.5x قيمة الجائزة الأساسية
            } else {
                prizeAmount = -Math.floor(settings.basePrize * 0.25); // أصغر خسارة
            }
            message = `لقد لعبت لعبة تلقائية! حصلت على ${prizeAmount} من العملات.`;

        } else if (actionType === 'triple-strike') {
            cost = settings.tripleStrikeCost;
            if (user.playerCoins < cost) {
                return res.status(400).json({ message: 'ليس لديك ما يكفي من العملات لـ Triple Strike.' });
            }
            user.playerCoins -= cost; // خصم التكلفة
            // منطق حساب الجائزة لـ triple-strike (من الكود الذي قدمته سابقاً)
            const random = Math.random();
            if (random < 0.5) { // 50% فرصة للفوز
                prizeAmount = Math.floor(settings.basePrize * (1 + Math.random() * 2)); // 1x - 3x قيمة الجائزة
            } else {
                prizeAmount = -Math.floor(settings.basePrize * 0.5); // خسارة 0.5x
            }
            message = `لقد استخدمت Triple Strike! حصلت على ${prizeAmount} من العملات.`;

        } else if (actionType === 'hammer-strike') {
            cost = settings.hammerStrikeCost;
            if (user.luckyPoints < cost) { // استخدام نقاط الحظ هنا
                return res.status(400).json({ message: 'ليس لديك ما يكفي من نقاط الحظ لـ Hammer Strike.' });
            }
            user.luckyPoints -= cost; // خصم التكلفة من نقاط الحظ
            // منطق حساب الجائزة لـ hammer-strike (من الكود الذي قدمته سابقاً)
            const random = Math.random();
            if (random < 0.7) { // 70% فرصة للفوز
                prizeAmount = Math.floor(settings.basePrize * (1.5 + Math.random() * 2.5)); // 1.5x - 4x قيمة الجائزة
                prizeType = 'lucky_points'; // قد تكون هذه الجائزة من نوع نقاط الحظ
            } else {
                prizeAmount = -Math.floor(settings.basePrize * 0.75); // خسارة 0.75x
            }
            message = `لقد استخدمت Hammer Strike! حصلت على ${prizeAmount} من ${prizeType === 'coins' ? 'العملات' : 'نقاط الحظ'}.`;

        } else {
            return res.status(400).json({ message: 'إجراء لعبة غير صالح.' });
        }

        // إضافة الجائزة إلى العملات أو نقاط الحظ
        if (prizeType === 'coins') {
            user.playerCoins += prizeAmount;
        } else { // lucky_points
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

// مسارات إجراءات اللعبة (محمية)
router.post('/auto-play', authMiddleware, (req, res) => handleGameAction(req, res, 'auto-play'));
router.post('/triple-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'triple-strike'));
router.post('/hammer-strike', authMiddleware, (req, res) => handleGameAction(req, res, 'hammer-strike'));

// module.exports = router; // هذا في نهاية الملف