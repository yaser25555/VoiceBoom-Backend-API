// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // تأكد من المسار الصحيح لنموذج المستخدم

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخراج الـ token من الـ Header
            token = req.headers.authorization.split(' ')[1];

            // التحقق من الـ token (فك التشفير)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // البحث عن المستخدم باستخدام الـ ID من الـ token (باستثناء كلمة المرور)
            req.user = await User.findById(decoded.user.id).select('-password');

            // إذا لم يتم العثور على المستخدم (ربما تم حذفه)، أرسل خطأ
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next(); // تابع إلى المسار التالي
        } catch (error) {
            console.error('Error in auth middleware:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// برمجية وسيطة للتحقق من أن المستخدم مشرف
const admin = (req, res, next) => {
    // protect middleware يجب أن يتم تشغيله قبل هذا
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };