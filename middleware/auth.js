// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// تأكد أن JWT_SECRET تم تعريفه كمتغير بيئة في Render.com
// أو في ملف .env إذا كنت تختبر محلياً
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // استخدم قيمة افتراضية للتطوير إذا لزم الأمر

module.exports = function (req, res, next) {
    // الحصول على التوكن من الهيدر (header)
    const token = req.header('x-auth-token');

    // التحقق مما إذا كان هناك توكن
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // التحقق من التوكن
        const decoded = jwt.verify(token, JWT_SECRET);

        // إضافة المستخدم من التوكن إلى كائن الطلب
        req.user = decoded.user;
        next(); // تابع إلى الدالة التالية في المسار
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};