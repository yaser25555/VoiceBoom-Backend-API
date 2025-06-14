// backend/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // لاستخدام نموذج المستخدم

module.exports = async function (req, res, next) {
    // الحصول على التوكن من الهيدر (header)
    const token = req.header('x-auth-token') || req.header('Authorization');

    // التحقق مما إذا كان هناك توكن
    if (!token || (token.startsWith('Bearer ') && token.split(' ')[1] === '')) {
        return res.status(401).json({ message: 'لا يوجد توكن، إذن مرفوض' });
    }

    let tokenValue = token;
    if (token.startsWith('Bearer ')) {
        tokenValue = token.split(' ')[1]; // استخراج قيمة التوكن بعد 'Bearer '
    }

    try {
        // التحقق من التوكن وصحته
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

        // البحث عن المستخدم باستخدام الـ ID من التوكن
        const user = await User.findById(decoded.user.id);

        // التحقق مما إذا كان المستخدم موجوداً وله صلاحيات المدير
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }
        if (!user.isAdmin) { // التحقق من حقل isAdmin
            return res.status(403).json({ message: 'وصول ممنوع: أنت لست مديراً.' });
        }

        // إذا كان المستخدم مديراً، أضف المستخدم إلى كائن الطلب (req)
        req.user = user; // يمكن الوصول لـ req.user.id, req.user.isAdmin
        next(); // تابع إلى المسار التالي (المسار المحمي للمدير)

    } catch (err) {
        console.error('Admin Auth Middleware Error:', err.message);
        // التعامل مع التوكن غير الصالح (مثلاً منتهي الصلاحية أو تم التلاعب به)
        res.status(401).json({ message: 'التوكن غير صالح' });
    }
};