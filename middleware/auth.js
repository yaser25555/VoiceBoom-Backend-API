// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// تأكد أن JWT_SECRET تم تعريفه كمتغير بيئة في Render.com
// أو في ملف .env إذا كنت تختبر محلياً
const JWT_SECRET = process.env.JWT_SECRET;

// *** إضافة سطر تسجيل لـ JWT_SECRET هنا ***
console.log('AuthMiddleware: JWT_SECRET loaded (first 5 chars):', JWT_SECRET ? JWT_SECRET.substring(0, 5) : 'Undefined/Null');


module.exports = function (req, res, next) {
    // الحصول على التوكن من الهيدر (header)
    // التأكد من دعم كلا النوعين: 'x-auth-token' و 'Authorization: Bearer'
    const token = req.header('x-auth-token') || req.header('Authorization');

    // التحقق مما إذا كان هناك توكن
    if (!token || (token.startsWith('Bearer ') && token.split(' ')[1] === '')) {
        return res.status(401).json({ message: 'لا يوجد توكن، إذن مرفوض' });
    }

    let tokenValue = token;
    if (token.startsWith('Bearer ')) {
        tokenValue = token.split(' ')[1]; // استخراج قيمة التوكن بعد 'Bearer '
    }

    // *** إضافة سطر تسجيل هنا لعرض أول جزء من التوكن ***
    console.log('AuthMiddleware: Token received (first 10 chars):', tokenValue.substring(0, 10) + '...');

    try {
        // التحقق من التوكن
        const decoded = jwt.verify(tokenValue, JWT_SECRET);

        // إضافة المستخدم من التوكن إلى كائن الطلب
        req.user = decoded.user;
        next(); // تابع إلى الدالة التالية في المسار
    } catch (err) {
        // *** تعديل سطر تسجيل الخطأ لتسجيل الخطأ كاملاً ***
        console.error('AuthMiddleware: JWT Verification Failed (Full Error Object):', err);
        res.status(401).json({ message: 'التوكن غير صالح أو انتهت صلاحيته' });
    }
};