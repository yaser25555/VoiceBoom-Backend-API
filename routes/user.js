// backend/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // استيراد نموذج المستخدم
const authMiddleware = require('../middleware/auth'); // لِحماية المسارات والوصول إلى req.user
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
            playerCoins: user.playerCoins,
            luckyPoints: user.luckyPoints,
            roundsPlayed: user.roundsPlayed,
            isAdmin: user.isAdmin // مهم للواجهة الأمامية لتبديل لوحة المدير
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// مسار لتحديث بيانات المستخدم (مثل النقاط بعد اللعب)
// هذا المسار عام وسيتم استدعاؤه بواسطة إجراءات اللعبة
router.put('/update', authMiddleware, async (req, res) => {
    const { playerCoins, luckyPoints, roundsPlayed } = req.body;
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.playerCoins = playerCoins !== undefined ? playerCoins : user.playerCoins;
        user.luckyPoints = luckyPoints !== undefined ? luckyPoints : user.luckyPoints;
        user.roundsPlayed = roundsPlayed !== undefined ? roundsPlayed : user.roundsPlayed;

        await user.save();
        res.json({ message: 'User data updated successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating user data', error: err.message });
    }
});

// دالة مساعدة لمعالجة إجراءات اللعبة لتجنب التكرار في الكود
async function handleGameAction(req, res, actionType) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const gameConfig = await Setting.findOne({ name: 'gameConfig' });
        if (!gameConfig || !gameConfig.value) {
            return res.status(500).json({ message: 'Game settings not configured on server' });
        }
        const settings = gameConfig.value;

        let cost = 0;
        let requiresLuckyPoints = false;

        switch (actionType) {
            case 'auto-play':
                cost = settings.autoPlayCost;
                break;
            case 'triple-hit':
                cost = settings.tripleHitCost;
                break;
            case 'hammer-hit':
                cost = settings.hammerHitCost;
                requiresLuckyPoints = true; // ضربة المطرقة تتطلب نقاط حظ
                break;
            default:
                return res.status(400).json({ message: 'Invalid game action type' });
        }

        if (requiresLuckyPoints) {
            if (user.luckyPoints < cost) {
                return res.status(400).json({ message: 'Not enough lucky points to perform this action' });
            }
            user.luckyPoints -= cost;
        } else {
            if (user.playerCoins < cost) {
                return res.status(400).json({ message: 'Not enough coins to perform this action' });
            }
            user.playerCoins -= cost;
        }

        // محاكاة منطق اللعبة (مبسط للتوضيح)
        const prizeType = settings.prizeType || 'coins'; // الافتراضي هو النقاط
        const prizeValue = settings.prizeValue || 10; // قيمة الجائزة الافتراضية

        let prizeAmount = 0;
        const random = Math.random(); // رقم عشوائي بين 0 و 1

        if (actionType === 'hammer-hit') { // ضربة المطرقة عادة تضمن فوزاً أو جائزة أكبر
            if (random < 0.7) { // 70% فرصة للفوز بالمطرقة
                prizeAmount = Math.floor(prizeValue * (1 + Math.random())); // من 1x إلى 2x قيمة الجائزة
            } else {
                prizeAmount = -Math.floor(prizeValue / 2); // خسارة بسيطة
            }
        } else if (actionType === 'triple-hit') {
             if (random < 0.5) { // 50% فرصة للفوز بالضربة الثلاثية
                prizeAmount = Math.floor(prizeValue * (0.5 + Math.random())); // من 0.5x إلى 1.5x قيمة الجائزة
            } else {
                prizeAmount = -Math.floor(prizeValue / 3); // خسارة أصغر
            }
        } else { // اللعب التلقائي (auto-play)
            if (random < 0.3) { // 30% فرصة للفوز باللعب التلقائي
                prizeAmount = Math.floor(prizeValue * Math.random()); // حتى 1x قيمة الجائزة
            } else {
                prizeAmount = -Math.floor(prizeValue / 4); // أصغر خسارة
            }
        }

        if (prizeType === 'coins') {
            user.playerCoins += prizeAmount;
        } else { // lucky_points
            user.luckyPoints += prizeAmount;
        }

        user.roundsPlayed += 1;

        await user.save();

        res.json({
            message: 'Game action successful',
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
router.post('/triple-hit', authMiddleware, (req, res) => handleGameAction(req, res, 'triple-hit'));
router.post('/hammer-hit', authMiddleware, (req, res) => handleGameAction(req, res, 'hammer-hit'));


module.exports = router;