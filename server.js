// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// قم باستيراد مساراتك (routes) هنا
// تأكد من أن هذه الملفات موجودة في مجلد 'routes' الخاص بك
const authRoutes = require('./routes/auth'); // مسارات المصادقة (التسجيل، الدخول)
const adminRoutes = require('./routes/admin'); // مسارات الإدارة (إعدادات اللعبة)
const userRoutes = require('./routes/user');   // مسارات المستخدم (جلب وتحديث بيانات المستخدم)
// const gameRoutes = require('./routes/gameRoutes'); // إذا كان لديك مسارات لعبة أخرى، قم باستيرادها هنا

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const app = express();

// **متغيرات البيئة الأساسية:**
// تأكد من أن هذه المتغيرات مضبوطة في ملف .env الخاص بك محلياً
// وفي إعدادات Render.com (قسم Environment Variables)
const MONGODB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000; // استخدام 10000 كمنفذ افتراضي، لأن Render يستخدمه أحياناً

// **البرمجيات الوسيطة (Middleware):**
// لتمكين الخادم من فهم البيانات بصيغة JSON القادمة في الطلبات
app.use(express.json());

// لتمكين CORS (Cross-Origin Resource Sharing)
// هذا ضروري للسماح للواجهة الأمامية (المستضافة على GitHub Pages) بالتواصل مع هذا الخادم
app.use(cors({
    origin: '*', // للسماح لأي نطاق بالوصول.
                  // للإنتاج، يُفضل استبدال '*' بنطاق GitHub Pages الخاص بك،
                  // مثال: 'https://yaser25555.github.io'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));


// **-- ملاحظة هامة جداً لـ (ENOENT Error) --**
// لا يوجد هنا أي كود يحاول خدمة ملفات الواجهة الأمامية (HTML, CSS, JS)
// الواجهة الأمامية يتم تقديمها بواسطة GitHub Pages بشكل منفصل تماماً.
// تأكد من عدم وجود أي أسطر مشابهة لهذه في ملف server.js الخاص بك:
// const path = require('path');
// app.use(express.static(path.join(__dirname, 'frontend')));
// app.get('*', (req, res) => { res.sendFile(path.resolve(__dirname, 'frontend', 'index.html')); });
// **----------------------------------------**


// **مسارات الـ API (API Routes):**
// قم بتضمين مساراتك هنا. هذه هي نقاط النهاية التي ستتفاعل معها الواجهة الأمامية.
// تأكد من أنك قمت بإنشاء الملفات المشار إليها هنا في مجلد 'routes'
app.use('/api/auth', authRoutes); // مثال: /api/auth/register, /api/auth/login
app.use('/api/admin', adminRoutes); // مثال: /api/admin/settings
app.use('/api/user', userRoutes);   // مثال: /api/user/data
// app.use('/api/game', gameRoutes); // إذا كان لديك مسارات لعبة أخرى، قم بإلغاء تعليق هذا السطر واستيرادها


// **مسار تجريبي بسيط (اختياري):**
// يمكنك إضافة هذا المسار لاختبار ما إذا كان الخادم يعمل أم لا.
// إذا ذهبت إلى رابط Render.com الخاص بك وأضفت له '/test' (مثال: https://your-app.onrender.com/test)
// سترى "Backend is running!"
app.get('/test', (req, res) => {
    res.status(200).send('Backend is running!');
});


// **اتصال قاعدة البيانات (MongoDB Connection):**
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        // بدء تشغيل الخادم بعد الاتصال بقاعدة البيانات
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        // يمكنك طباعة رسالة الخطأ كاملة للمزيد من التفاصيل في السجلات
        console.error('Error details:', err);
        process.exit(1); // إنهاء العملية إذا فشل الاتصال بقاعدة البيانات
    });

// معالجة الأخطاء غير الملتقطة (اختياري لكن مستحسن)
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise} - reason: ${err.message}`);
    // يمكنك هنا تسجيل الخطأ أو إغلاق الخادم بشكل سليم
});

// تصدير التطبيق (اختياري، قد يكون مفيداً للاختبارات)
module.exports = app;