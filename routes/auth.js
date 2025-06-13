// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // تأكد من المسار الصحيح لنموذج المستخدم

const JWT_SECRET = process.env.JWT_SECRET; // تأكد أن هذا المتغير متاح في Render

console.log('Auth routes module loaded.'); // تأكيد تحميل مسارات auth

// مسار التسجيل (Register Route)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    console.log('Attempting registration for:', username, email); // سجل محاولة التسجيل
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username is already taken' });
        }
        user = new User({ username, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ message: 'User registered successfully', token, isAdmin: user.isAdmin });
            }
        );
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).send('Server error during registration');
    }
});

// مسار تسجيل الدخول (Login Route)
router.post('/login', async (req, res) => {
    console.log('Attempting login for:', req.body.identifier); // سجل محاولة تسجيل الدخول
    // الآن نستقبل حقل واحد يمكن أن يكون إما بريد إلكتروني أو اسم مستخدم
    const { identifier, password } = req.body;

    try {
        let user;
        // محاولة العثور على المستخدم بالبريد الإلكتروني أولاً
        user = await User.findOne({ email: identifier });

        // إذا لم يتم العثور عليه بالبريد الإلكتروني، حاول باسم المستخدم
        if (!user) {
            user = await User.findOne({ username: identifier });
        }

        // إذا لم يتم العثور على المستخدم على الإطلاق
        if (!user) {
            console.log('Login failed: User not found for identifier', identifier);
            return res.status(400).json({ message: 'بيانات اعتماد غير صحيحة' });
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Password mismatch for user', user.username);
            return res.status(400).json({ message: 'بيانات اعتماد غير صحيحة' });
        }

        // إنشاء الـ Token
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                // إرجاع التوكن، وisAdmin، واسم المستخدم
                res.json({ message: 'تم تسجيل الدخول بنجاح', token, isAdmin: user.isAdmin, username: user.username });
            }
        );
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error during login');
    }
});

module.exports = router;