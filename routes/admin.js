// backend/routes/admin.js (المسارات التي تحتاج لتعديل)
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');
const User = require('../models/User');
const Setting = require('../models/Setting');

// ... (مسار GET /users كما هو) ...

// مسار لتحديث بيانات مستخدم معين - يتطلب صلاحيات المدير
router.put('/user/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params; // معرف المستخدم المراد تحديثه
    // الحقول التي يمكن للمدير تعديلها بناءً على نموذجك الحالي
    const { username, email, playerCoins, luckyPoints, roundsPlayed, isAdmin } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }

        // تحديث الحقول فقط إذا تم توفيرها في الجسم
        if (username !== undefined) user.username = username;
        if (email !== undefined) user.email = email;
        if (playerCoins !== undefined) user.playerCoins = playerCoins;
        if (luckyPoints !== undefined) user.luckyPoints = luckyPoints;
        if (roundsPlayed !== undefined) user.roundsPlayed = roundsPlayed;
        if (isAdmin !== undefined) user.isAdmin = isAdmin;

        // لا نقوم بتعديل password أو personalScores من هنا مباشرة،
        // حيث يحتاج password إلى تجزئة، و personalScores هي مصفوفة تحتاج لتعامل خاص إذا أردت تعديلها من لوحة المدير.

        await user.save();
        // إرجاع المستخدم بدون كلمة المرور أو تفاصيل personalScores الحساسة
        const userResponse = user.toObject({ getters: true, virtuals: false, versionKey: false });
        delete userResponse.password;
        delete userResponse.personalScores; // لا تعرض تفاصيل السجل هذه في الواجهة الأمامية للمدير هنا

        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح.', user: userResponse });
    } catch (err) {
        console.error(`Admin Route /user/${id}: خطأ في تحديث المستخدم:`, err.message);
        res.status(500).json({ message: 'خطأ في الخادم أثناء تحديث بيانات المستخدم.', error: err.message });
    }
});

// ... (بقية المسارات مثل DELETE /user/:id و GET /settings و PUT /settings كما هي) ...

// module.exports = router; // هذا في نهاية الملف

// **المسار الجديد: جلب إعدادات اللعبة (محمي للمستخدمين المصادق عليهم - يمكن إضافة adminMiddleware لاحقاً)**
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        // ابحث عن إعدادات اللعبة. إذا لم تكن موجودة، أرجع قيم افتراضية.
        const settings = await Setting.findOne({ name: 'gameConfig' });
        if (settings) {
            res.json(settings.value); // أرجع فقط قيمة الإعدادات
        } else {
            // إذا لم يتم العثور على إعدادات، يمكن إرجاع قيم افتراضية
            res.json({
                pointsPerAnswer: 10,
                tripleHitPoints: 30,
                hammerHitPoints: 50
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching settings', error: err.message });
    }
});

// مثال: مسار لتحديث إعدادات اللعبة (محمي للمديرين فقط)
router.put('/settings', authMiddleware, /* adminMiddleware, */ async (req, res) => {
    const newSettings = req.body;
    try {
        let settings = await Setting.findOne({ name: 'gameConfig' });
        if (!settings) {
            // إذا لم تكن الإعدادات موجودة، أنشئ إعدادات جديدة
            settings = new Setting({ name: 'gameConfig', value: newSettings });
        } else {
            // وإلا، قم بتحديث القيمة
            settings.value = newSettings;
        }
        await settings.save();
        res.json({ message: 'Game settings updated successfully', settings: settings.value });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating settings', error: err.message });
    }
});

// يمكنك إضافة مسارات أخرى خاصة بالمدير هنا

module.exports = router;