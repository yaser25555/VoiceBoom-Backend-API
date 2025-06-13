// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // لتشفير كلمات المرور
const jwt = require('jsonwebtoken'); // لإنشاء والتحقق من التوكنز
const User = require('../models/User'); // استيراد موديل المستخدم

// جلب JWT Secret من متغيرات البيئة
const JWT_SECRET = process.env.JWT_SECRET;

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجوداً بالفعل
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // التحقق مما إذا كان اسم المستخدم موجوداً بالفعل
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // إنشاء مستخدم جديد
        user = new User({
            username,
            email,
            password
        });

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // حفظ المستخدم في قاعدة البيانات
        await user.save();

        // إنشاء وتوقيع JWT
        const payload = {
            user: {
                id: user.id,
                // يمكنك إضافة isAdmin هنا إذا كنت تخزنها في الموديل
                // isAdmin: user.isAdmin // إذا كان هذا الحقل موجوداً في موديل المستخدم
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }, // صلاحية التوكن لساعة واحدة
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ message: 'User registered successfully', token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during registration', error: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجوداً
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // مقارنة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // إنشاء وتوقيع JWT
        const payload = {
            user: {
                id: user.id,
                // يمكنك إضافة isAdmin هنا إذا كنت تخزنها في الموديل
                // isAdmin: user.isAdmin // إذا كان هذا الحقل موجوداً في موديل المستخدم
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }, // صلاحية التوكن لساعة واحدة
            (err, token) => {
                if (err) throw err;
                res.json({ message: 'Logged in successfully', token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during login', error: err.message });
    }
});

module.exports = router;