// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // تأكد من المسار الصحيح لنموذج المستخدم

const protect = async (req, res, next) => {
    let token;
    console.log('Protect Middleware: Starting'); // <-- log جديد

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخراج الـ token من الـ Header
            token = req.headers.authorization.split(' ')[1];
            console.log('Protect Middleware: Token received'); // <-- log جديد

            // التحقق من الـ token (فك التشفير)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Protect Middleware: Token decoded successfully. Decoded ID:', decoded.id); // <-- log جديد

            // البحث عن المستخدم باستخدام الـ ID من الـ token (باستثناء كلمة المرور)
            // *** تم إصلاح هذا السطر ***: يجب أن يكون decoded.id بدلاً من decoded.user.id
            req.user = await User.findById(decoded.id).select('-password'); 

            // إذا لم يتم العثور على المستخدم (ربما تم حذفه)، أرسل خطأ
            if (!req.user) {
                console.log('Protect Middleware: User not found for decoded ID'); // <-- log جديد
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            console.log('Protect Middleware: User attached to request:', req.user.username); // <-- log جديد
            next(); // تابع إلى المسار التالي
        } catch (error) {
            console.error('Protect Middleware: Token verification failed:', error.message); // <-- تم تغيير الرسالة
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        console.log('Protect Middleware: No token found'); // <-- log جديد
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// برمجية وسيطة للتحقق من أن المستخدم مشرف
const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };