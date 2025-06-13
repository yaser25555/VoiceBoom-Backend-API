// backend/middleware/auth.js
const jwt = require('jsonwebtoken'); // لفك تشفير التوكن
const JWT_SECRET = process.env.JWT_SECRET; // جلب المفتاح السري من متغيرات البيئة

// Middleware لحماية المسارات
module.exports = function (req, res, next) {
    // جلب التوكن من الهيدر (Header)
    const token = req.header('x-auth-token'); // الهيدر الشائع لـ JWT

    // التحقق مما إذا كان التوكن موجوداً
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // التحقق من صحة التوكن
        const decoded = jwt.verify(token, JWT_SECRET);

        // إضافة معلومات المستخدم من التوكن إلى كائن الطلب (req)
        req.user = decoded.user;
        next(); // الانتقال إلى الـ middleware أو الـ route التالي
    } catch (err) {
        // إذا كان التوكن غير صالح
        res.status(401).json({ message: 'Token is not valid' });
    }
};