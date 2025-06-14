// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');
const User = require('../models/User');
const Setting = require('../models/Setting');

// مسار لجلب جميع المستخدمين (محمي للمديرين فقط)
router.get('/users', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password'); // لا ترجع كلمات المرور
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching users', error: err.message });
    }
});

// مسار لتحديث بيانات مستخدم معين - يتطلب صلاحيات المدير
router.put('/user/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { username, email, playerCoins, luckyPoints, roundsPlayed, isAdmin } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }

        if (username !== undefined) user.username = username;
        if (email !== undefined) user.email = email;
        if (playerCoins !== undefined) user.playerCoins = playerCoins;
        if (luckyPoints !== undefined) user.luckyPoints = luckyPoints;
        if (roundsPlayed !== undefined) user.roundsPlayed = roundsPlayed;
        if (isAdmin !== undefined) user.isAdmin = isAdmin;

        await user.save();
        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح.', user: user.toObject({ getters: true, virtuals: false, transform: (doc, ret) => { delete ret.password; return ret; } }) }); // إرجاع المستخدم بدون كلمة المرور
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating user', error: err.message });
    }
});

// مسار لحذف مستخدم معين - يتطلب صلاحيات المدير
router.delete('/user/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByIdAndDelete(id); // استخدم findByIdAndDelete
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }
        res.json({ message: 'تم حذف المستخدم بنجاح.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error deleting user', error: err.message });
    }
});

// مسار لجلب إعدادات اللعبة (محمي للمديرين فقط)
router.get('/settings', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        const settings = await Setting.findOne({ name: 'gameConfig' });
        if (settings) {
            res.json(settings.value); // أرجع فقط قيمة الإعدادات
        } else {
            // إذا لم يتم العثور على إعدادات، يمكن إرجاع قيم افتراضية
            // (يجب أن تتطابق هذه الافتراضيات مع الافتراضيات في الواجهة الأمامية)
            res.json({
                initialCoins: 500,
                autoPlayCost: 20,
                tripleStrikeCost: 30,
                hammerStrikeCost: 5,
                autoPlayRewardMin: 10,
                autoPlayRewardMax: 50,
                tripleStrikeReward: 100,
                hammerStrikeReward: 500,
                adminRewardMultiplier: 1.5,
                currentBackgroundUrl: '', // يمكنك وضع رابط افتراضي هنا
                currentSoundUrl: ''     // يمكنك وضع رابط افتراضي هنا
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching settings', error: err.message });
    }
});

// مسار لتحديث إعدادات اللعبة (محمي للمديرين فقط)
// تأكد من أن هذا المسار هو PUT وأن الواجهة الأمامية ترسل PUT إليه
router.put('/settings', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const newSettings = req.body;
    try {
        let settings = await Setting.findOne({ name: 'gameConfig' });
        if (!settings) {
            settings = new Setting({ name: 'gameConfig', value: newSettings });
        } else {
            settings.value = newSettings;
        }
        await settings.save();
        res.json({ message: 'تم تحديث إعدادات اللعبة بنجاح.', settings: settings.value });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saving settings', error: err.message });
    }
});

// مسار لإعادة تعيين اللعبة لجميع المستخدمين (محمي للمديرين فقط)
router.post('/reset-all-users', authMiddleware, adminAuthMiddleware, async (req, res) => {
    console.log('POST /api/admin/reset-all-users: طلب إعادة تعيين جميع المستخدمين بدأ.');
    try {
        const settingsDoc = await Setting.findOne({ name: 'gameConfig' });
        if (!settingsDoc || !settingsDoc.value) {
            console.error('POST /api/admin/reset-all-users: إعدادات اللعبة غير موجودة في قاعدة البيانات!');
            return res.status(500).json({ message: 'Game settings not found to reset users' });
        }
        const settings = settingsDoc.value;

        // إعادة تعيين جميع المستخدمين إلى القيم الأولية
        await User.updateMany({}, {
            playerCoins: settings.initialCoins || 500,
            luckyPoints: 0,
            roundsPlayed: 0,
            personalScores: []
        });

        console.log('POST /api/admin/reset-all-users: تم إعادة تعيين جميع المستخدمين بنجاح.');
        res.json({ message: 'تم إعادة تعيين جميع المستخدمين إلى القيم الأولية بنجاح.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error resetting all users', error: err.message });
    }
});

module.exports = router;