// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Setting = require('../models/Setting'); // تأكد أن لديك نموذج (Model) باسم Setting
const authMiddleware = require('../middleware/auth');
// إذا كان لديك middleware خاص بالمدير للتحقق من أن المستخدم هو مدير:
// const adminMiddleware = require('../middleware/admin');


// مثال: مسار لجلب جميع المستخدمين (محمي للمديرين فقط)
// ستحتاج إلى adminMiddleware إذا أردت التأكد من أن المستخدم مدير
router.get('/users', authMiddleware, /* adminMiddleware, */ async (req, res) => {
    try {
        const users = await User.find().select('-password'); // استبعاد كلمات المرور
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching users', error: err.message });
    }
});

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