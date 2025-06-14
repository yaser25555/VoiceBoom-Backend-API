// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // لتشفير وفك تشفير كلمات المرور
const jwt = require('jsonwebtoken'); // لإنشاء الرموز (Tokens)
const User = require('../models/User'); // تأكد من أن هذا المسار صحيح لملف نموذج المستخدم الخاص بك (User model)

// **مسار التسجيل (POST /api/auth/register)**
router.post('/register', async (req, res) => {
    console.log('Register request body received:', req.body); // طباعة البيانات المستلمة للتسجيل

    const { username, email, password } = req.body; // <-- تأكد من مطابقة هذه الأسماء لمدخلات الواجهة الأمامية

    // التحقق من وجود جميع الحقول المطلوبة
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        // التحقق مما إذا كان اسم المستخدم أو البريد الإلكتروني موجودين بالفعل
        let user = await User.findOne({ username });
        if (user) {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'Email already exists.' });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إنشاء مستخدم جديد
        user = new User({
            username,
            email,
            password: hashedPassword,
            isAdmin: false // افتراضيًا، المستخدم الجديد ليس مشرفًا
        });

        await user.save(); // حفظ المستخدم في قاعدة البيانات

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// **مسار تسجيل الدخول (POST /api/auth/login)**
router.post('/login', async (req, res) => {
    console.log('Login request body received:', req.body); // **هذا السطر مهم جداً للتصحيح!**

    // **هنا يتم استخراج اسم المستخدم وكلمة المرور من جسم الطلب**
    // **تأكد أن "username" و "password" هنا يطابقان تماماً ما ترسله الواجهة الأمامية.**
    const { username, password } = req.body;

    // التحقق من أن الحقول ليست فارغة
    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        // البحث عن المستخدم في قاعدة البيانات باستخدام اسم المستخدم
        // **تأكد أنك تبحث عن الحقل الصحيح في نموذج المستخدم (عادةً 'username' أو 'email')**
        const user = await User.findOne({ username: username });

        if (!user) {
            // إذا لم يتم العثور على المستخدم، أرجع رسالة خطأ
            return res.status(400).json({ message: 'Invalid credentials: User not found.' });
        }

        // مقارنة كلمة المرور المدخلة بكلمة المرور المشفرة في قاعدة البيانات
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // إذا لم تتطابق كلمات المرور، أرجع رسالة خطأ
            return res.status(400).json({ message: 'Invalid credentials: Password incorrect.' });
        }

        // إذا تم التحقق بنجاح، قم بإنشاء رمز JWT
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin // لتمرير حالة الإدارة
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // تأكد من تعريف JWT_SECRET في ملف .env
            { expiresIn: '1h' }, // صلاحية الرمز لساعة واحدة
            (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    message: 'Login successful!',
                    token,
                    username: user.username,
                    isAdmin: user.isAdmin
                });
            }
        );

    } catch (err) {
        console.error('Login error:', err.message); // سجل الخطأ الكامل هنا
        res.status(500).json({ message: 'Server error during login.' });
    }
});

module.exports = router;