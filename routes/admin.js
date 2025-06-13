// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // استيراد نموذج المستخدم الصحيح
const Setting = require('../models/Setting'); // استيراد نموذج الإعدادات (إذا كان موجوداً)
const authMiddleware = require('../middleware/auth'); // لِحماية المسارات
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
// مثل:
// - router.post('/user/create', ...)
// - router.put('/user/:id', ...) لتعديل مستخدم معين
// - router.delete('/user/:id', ...) لحذف مستخدم

module.exports = router;