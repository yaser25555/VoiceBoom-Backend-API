// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// استيراد مسارات الـ API
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const app = express();

// **متغيرات البيئة الأساسية:**
const MONGODB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

// **البرمجيات الوسيطة (Middleware):**
app.use(express.json()); // لفهم البيانات بصيغة JSON
app.use(cors({ // لتمكين CORS للسماح للواجهة الأمامية بالتواصل
    origin: '*', // للسماح لأي نطاق. للإنتاج، استبدله بنطاق GitHub Pages الخاص بك.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// **-- تأكيد: لا يوجد هنا أي كود لتقديم ملفات الواجهة الأمامية --**
// **تأكد 100% أن هذه الأسطر (أو ما يشابهها) غير موجودة في ملف server.js الخاص بك محلياً:**
// const path = require('path');
// app.use(express.static(path.join(__dirname, 'frontend')));
// app.get('*', (req, res) => { res.sendFile(path.resolve(__dirname, 'frontend', 'index.html')); });
// **------------------------------------------------------------------**

// **مسارات الـ API (API Routes):**
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// **مسار تجريبي بسيط:**
app.get('/test', (req, res) => {
    res.status(200).send('Backend is running!');
});

// **اتصال قاعدة البيانات (MongoDB Connection):**
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        console.error('Error details:', err);
        process.exit(1);
    });

module.exports = app;