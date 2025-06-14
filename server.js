// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// استيراد مسارات الـ API والـ middleware
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin'); // إذا كان لديك هذا الملف
const gameRoutes = require('./routes/game'); // **الجديد: استيراد مسارات اللعبة**
// const userRoutes = require('./routes/user'); // لا تحتاج لاستيرادها إذا كانت داخل game.js
// ولكن لضمان عدم وجود تكرار أو تعارض، قد تفضل وجودها في ملف routes/user.js منفصل

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const app = express();

// Middleware لتسجيل كل طلب وارد
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

// متغيرات البيئة الأساسية
const MONGODB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET; // تأكد من استيراد JWT_SECRET

// البرمجيات الوسيطة (Middleware):
app.use(express.json()); // لفهم البيانات بصيغة JSON
app.use(express.urlencoded({ extended: true })); // مفيد أيضاً للنماذج العادية (إذا لم تكن تستخدم JSON)

app.use(cors({
    origin: '*', // تذكر تغيير هذا في الإنتاج
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// ربط مسارات الـ API (API Routes):
app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes); // يمكنك إبقائها منفصلة إذا كان لديك مسارات إدارية أخرى

// **الجديد: إضافة مسارات اللعبة والـ user data**
app.use('/api/game', gameRoutes); // كل الطلبات التي تبدأ بـ '/api/game' ستذهب إلى gameRoutes
app.use('/api/user', gameRoutes); // استخدم نفس gameRoutes لـ '/api/user/me' إذا كانت داخل نفس الملف

// مسار تجريبي بسيط:
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

// ربط قاعدة البيانات MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// معالجة الأخطاء غير الملتقطة
process.on('unhandledRejection', (err, promise) => {
    console.error(`Logged Error: ${err.message}`);
});