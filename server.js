// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ******************************************************
// 1. الاتصال بقاعدة البيانات MongoDB
// ******************************************************
mongoose.connect('mongodb://localhost:27017/voiceboom', {
}).then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ******************************************************
// 2. Middleware
// ******************************************************
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ******************************************************
// 3. تعريف نماذج Mongoose
// ******************************************************
// نموذج المستخدم
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    personalScore: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
    roundNumber: { type: Number, default: 0 },
});

// نموذج الإعدادات
const settingsSchema = new mongoose.Schema({
    numBoxes: { type: Number, default: 10 },
    // حقول لعدد الصناديق التي تضيف نقاط
    num10PointsBoxes: { type: Number, default: 1 },
    num5PointsBoxes: { type: Number, default: 2 },
    num1PointsBoxes: { type: Number, default: 3 },
    // حقول لعدد صناديق الضريبة (تخصم نقاط)
    numNegative5PointsBoxes: { type: Number, default: 1 },
    numNegative10PointsBoxes: { type: Number, default: 0 },

    totalRoundsPlayed: { type: Number, default: 0 },
    totalPrizeMoneyAwarded: { type: Number, default: 0 }, // يمكن تغيير اسمها لتناسب "النقاط الممنوحة"
});

const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// ******************************************************
// 4. مسارات الـ API (API Routes)
// ******************************************************

// مسار التسجيل
app.post('/api/register', async (req, res) => {
    const { username, password, isAdmin } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان.' });
    }
    try {
        const newUser = new User({ username, password, isAdmin: isAdmin || false });
        await newUser.save();
        res.status(201).json({ message: 'تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.', user: { username: newUser.username, isAdmin: newUser.isAdmin } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'اسم المستخدم موجود بالفعل. الرجاء اختيار اسم آخر.' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء التسجيل.' });
    }
});

// مسار تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان.' });
    }
    try {
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
        }
        res.json({ message: 'تم تسجيل الدخول بنجاح!', user: { username: user.username, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء تسجيل الدخول.' });
    }
});

// مسار بدء جولة جديدة (يتضمن حفظ النقاط التي تم جمعها في الجولة السابقة وتحديث نقاط المستخدم)
app.post('/api/startRound', async (req, res) => {
    const { username, pointsEarnedInRound } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }

        // تحديث نقاط المستخدم بناءً على الجولة السابقة
        if (typeof pointsEarnedInRound === 'number') {
            user.personalScore += pointsEarnedInRound;
            // يمكن إضافة هذا السطر لمنع النقاط من أن تصبح سالبة إذا كان هذا مطلوبًا
            // user.personalScore = Math.max(0, user.personalScore); 
            if (user.personalScore > user.highScore) {
                user.highScore = user.personalScore;
            }
        }
        user.roundNumber += 1;
        await user.save();

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }

        res.json({
            message: 'تم بدء جولة جديدة!',
            user: {
                username: user.username,
                personalScore: user.personalScore,
                highScore: user.highScore,
                roundNumber: user.roundNumber
            },
            settings: {
                numBoxes: settings.numBoxes,
                num10PointsBoxes: settings.num10PointsBoxes,
                num5PointsBoxes: settings.num5PointsBoxes,
                num1PointsBoxes: settings.num1PointsBoxes,
                numNegative5PointsBoxes: settings.numNegative5PointsBoxes,
                numNegative10PointsBoxes: settings.numNegative10PointsBoxes
            }
        });

    } catch (error) {
        console.error('Error starting round:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء بدء الجولة.' });
    }
});

// مسار لحفظ إعدادات اللعبة (للمشرف)
app.put('/api/saveSettings', async (req, res) => {
    const { 
        numBoxes, 
        num10PointsBoxes, 
        num5PointsBoxes, 
        num1PointsBoxes,
        numNegative5PointsBoxes, 
        numNegative10PointsBoxes 
    } = req.body;

    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({
                numBoxes,
                num10PointsBoxes,
                num5PointsBoxes,
                num1PointsBoxes,
                numNegative5PointsBoxes,
                numNegative10PointsBoxes
            });
        } else {
            settings.numBoxes = numBoxes;
            settings.num10PointsBoxes = num10PointsBoxes;
            settings.num5PointsBoxes = num5PointsBoxes;
            settings.num1PointsBoxes = num1PointsBoxes;
            settings.numNegative5PointsBoxes = numNegative5PointsBoxes;
            settings.numNegative10PointsBoxes = numNegative10PointsBoxes;
        }
        await settings.save();
        res.json({ message: 'تم حفظ الإعدادات بنجاح!', settings: settings });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء حفظ الإعدادات.' });
    }
});

// مسار لإعادة تعيين جميع المستخدمين والإعدادات (للمشرف)
app.post('/api/resetAllUsers', async (req, res) => {
    try {
        await User.updateMany({}, { personalScore: 0, highScore: 0, roundNumber: 0 });
        await Settings.deleteMany({}); // لإعادة تعيين الإعدادات إلى الافتراضيات
        res.json({ message: 'تمت إعادة تعيين جميع المستخدمين والإعدادات بنجاح.' });
    } catch (error) {
        console.error('Error resetting all users:', error);
        res.status(500).json({ message: 'Internal server error while resetting all users.' });
    }
});

// مسار لوحة الصدارة (Leaderboard)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await User.find({})
                                      .sort({ personalScore: -1 })
                                      .limit(10)
                                      .select('username personalScore -_id');
        res.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Internal server error while fetching leaderboard.' });
    }
});

// مسار لجلب بيانات اللعبة الأولية للمستخدم والإعدادات
app.get('/api/gameData', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }

        res.json({
            user: {
                username: user.username,
                personalScore: user.personalScore,
                highScore: user.highScore,
                roundNumber: user.roundNumber
            },
            settings: {
                numBoxes: settings.numBoxes,
                num10PointsBoxes: settings.num10PointsBoxes,
                num5PointsBoxes: settings.num5PointsBoxes,
                num1PointsBoxes: settings.num1PointsBoxes,
                numNegative5PointsBoxes: settings.numNegative5PointsBoxes,
                numNegative10PointsBoxes: settings.numNegative10PointsBoxes
            }
        });
    } catch (error) {
        console.error('Error fetching game data:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء جلب بيانات اللعبة.' });
    }
});

// مسار خدمة ملف HTML الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// بدء تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});