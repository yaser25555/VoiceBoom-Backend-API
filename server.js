// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// استيراد مسارات الـ API
// تأكد أن المسار هنا './routes/auth' هو المسار الصحيح للملف الذي سيحتوي على منطق تسجيل الدخول/التسجيل
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin'); // إذا كان لديك هذا الملف
const userRoutes = require('./routes/user');   // إذا كان لديك هذا الملف

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const app = express();

// Middleware لتسجيل كل طلب وارد - هذا مفيد جداً للتصحيح
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

// متغيرات البيئة الأساسية (تأكد من تعريفها في ملف .env الخاص بك على Render)
const MONGODB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

// **البرمجيات الوسيطة (Middleware):**
app.use(express.json()); // **هذا السطر هو الأهم لفهم بيانات JSON من الواجهة الأمامية**
app.use(express.urlencoded({ extended: true })); // مفيد أيضاً للنماذج العادية (إذا لم تكن تستخدم JSON)

app.use(cors({ // لتمكين CORS للسماح للواجهة الأمامية بالتواصل
    origin: '*', // * للسماح لأي نطاق. **في بيئة الإنتاج، يجب استبداله بنطاق الواجهة الأمامية الخاص بك (مثل رابط Vercel أو GitHub Pages)**
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// **ربط مسارات الـ API (API Routes):**
// كل الطلبات التي تبدأ بـ '/api/auth' ستذهب إلى authRoutes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // استخدم هذا إذا كان لديك مسارات للمشرف
app.use('/api/user', userRoutes);   // استخدم هذا إذا كان لديك مسارات للمستخدمين العاديين

// **مسار تجريبي بسيط:** (للتأكد أن الخادم يعمل)
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

// ربط قاعدة البيانات MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        // بدء تشغيل الخادم بعد الاتصال الناجح بقاعدة البيانات
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // إنهاء العملية إذا فشل الاتصال بقاعدة البيانات
    });

// معالجة الأخطاء غير الملتقطة
process.on('unhandledRejection', (err, promise) => {
    console.error(`Logged Error: ${err.message}`);
    // إغلاق الخادم والعملية (اختياري، ولكن يوصى به في الإنتاج)
    // server.close(() => process.exit(1));
});