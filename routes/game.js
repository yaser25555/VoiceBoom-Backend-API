// backend/routes/game.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware'); // استيراد الـ middleware
const User = require('../models/User'); // استيراد نموذج المستخدم

// **مسار جلب بيانات المستخدم (GET /api/user/me)**
// هذا المسار سيستخدمه الواجهة الأمامية (game.html) لجلب بيانات المستخدم المحدثة عند تحميل الصفحة
router.get('/user/me', protect, async (req, res) => {
    try {
        // req.user يأتي من الـ middleware 'protect' ويحتوي على بيانات المستخدم
        // لا نحتاج للبحث في قاعدة البيانات مرة أخرى
        res.status(200).json({
            message: 'User data fetched successfully!',
            user: {
                username: req.user.username,
                totalScore: req.user.totalScore,
                roundsPlayed: req.user.roundsPlayed,
                autoPlayStrikes: req.user.autoPlayStrikes,
                tripleStrikes: req.user.tripleStrikes,
                hammerStrikes: req.user.hammerStrikes,
                isAdmin: req.user.isAdmin
                // أضف أي بيانات أخرى تريد إرسالها للواجهة الأمامية
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error fetching user data.' });
    }
});


// **مسار بدء جولة جديدة (POST /api/game/start-round)**
router.post('/start-round', protect, async (req, res) => {
    try {
        // هنا يمكنك تهيئة أي بيانات خاصة بالجولة للمستخدم
        // على سبيل المثال، إعطاء المستخدم 5 ضربات تلقائية عند بدء كل جولة جديدة
        // أو التحقق مما إذا كان لديهم ما يكفي من العملة لبدء جولة
        req.user.roundsPlayed = (req.user.roundsPlayed || 0) + 1;
        // يمكنك إعطاء ضربات جديدة هنا أو إدارتها بشكل مختلف
        // For now, let's assume strikes are consumed and not reset per round unless designed that way.
        // For a new game, you might want to give some initial strikes if they are limited per session/game.
        // req.user.autoPlayStrikes = 5; // مثال: إعطاء 5 ضربات تلقائية لكل جولة
        // req.user.tripleStrikes = 1;
        // req.user.hammerStrikes = 0;

        await req.user.save(); // حفظ التغييرات على المستخدم

        res.status(200).json({
            message: 'New round started successfully!',
            user: {
                username: req.user.username,
                totalScore: req.user.totalScore,
                roundsPlayed: req.user.roundsPlayed,
                autoPlayStrikes: req.user.autoPlayStrikes,
                tripleStrikes: req.user.tripleStrikes,
                hammerStrikes: req.user.hammerStrikes
            }
        });
    } catch (error) {
        console.error('Error starting new round:', error);
        res.status(500).json({ message: 'Server error starting new round.' });
    }
});

// **مسار الكشف عن الصندوق (POST /api/game/reveal-box)**
router.post('/reveal-box', protect, async (req, res) => {
    const { boxIndex } = req.body;
    console.log(`User ${req.user.username} revealing box ${boxIndex}`);

    // هنا يتم تطبيق منطق الكشف عن الصندوق
    // يجب أن تكون القيم (نقاط الصندوق) مخزنة على الخادم، وليس في الواجهة الأمامية
    // مثال بسيط: يمكن أن نحدد صندوق فائز واحد هنا
    const WINNING_BOX_INDEX = 50; // افتراضياً، الصندوق رقم 51 هو الفائز (0-based index)
    const WINNING_POINTS = 100;
    const LOOSING_POINTS = -10; // نقاط سلبية
    const NORMAL_POINTS = 5;

    let pointsEarned = 0;
    let message = 'تم الكشف عن الصندوق.';
    let boxContent = null; // لمحتوى الصندوق (مثل مسار صورة)

    // هذا المنطق يجب أن يكون أكثر تعقيداً في لعبة حقيقية (مثلاً، مصفوفة من المكافآت/العقوبات)
    if (boxIndex === WINNING_BOX_INDEX) {
        pointsEarned = WINNING_POINTS;
        message = 'تهانينا! لقد وجدت الصندوق الذهبي!';
        boxContent = 'gold_box.png'; // مثال: اسم ملف الصورة للمحتوى
        // يمكنك هنا إنهاء الجولة أو إعطاء مكافأة خاصة
    } else if (boxIndex % 7 === 0) { // مثال آخر: صناديق معينة تعطي نقاطاً سلبية
        pointsEarned = LOOSING_POINTS;
        message = 'أوه! لقد خسرت بعض النقاط.';
        boxContent = 'bomb.png';
    } else {
        pointsEarned = NORMAL_POINTS;
        message = `حصلت على ${NORMAL_POINTS} نقاط!`;
        boxContent = 'coins.png';
    }

    try {
        // تحديث نقاط المستخدم في قاعدة البيانات
        req.user.totalScore = (req.user.totalScore || 0) + pointsEarned;
        // يمكن أيضاً خصم "ضربة" من عدد الضربات المتبقية إذا كان الكشف يعتبر ضربة
        // req.user.strikesRemaining--; // إذا كان لديك هذا الحقل
        await req.user.save();

        res.status(200).json({
            message: message,
            currentScore: pointsEarned, // هذه هي النقاط التي حصل عليها من هذا الصندوق
            user: { // إرسال بيانات المستخدم المحدثة للواجهة الأمامية
                username: req.user.username,
                totalScore: req.user.totalScore,
                roundsPlayed: req.user.roundsPlayed,
                autoPlayStrikes: req.user.autoPlayStrikes,
                tripleStrikes: req.user.tripleStrikes,
                hammerStrikes: req.user.hammerStrikes
            },
            boxContent: boxContent, // إرسال محتوى الصندوق
            gameOver: false // إذا لم تكن هذه الضربة تنهي اللعبة
        });

    } catch (error) {
        console.error('Error revealing box:', error);
        res.status(500).json({ message: 'Server error revealing box.' });
    }
});


// **مسار جمع النقاط (POST /api/game/collect-points)**
router.post('/collect-points', protect, async (req, res) => {
    const { currentRoundScore } = req.body;
    console.log(`User ${req.user.username} collecting ${currentRoundScore} points.`);

    try {
        // في هذا المسار، نفترض أن النقاط التي تم كسبها بالفعل في الجولة
        // تم تحديثها في 'totalScore' في مسار 'reveal-box'
        // لذا، هنا قد لا تحتاج إلى إضافة نقاط مرة أخرى، بل فقط تأكيد
        // أو يمكنك هنا تحويل نقاط الجولة المؤقتة إلى نقاط دائمة إذا لم يتم ذلك في 'reveal-box'
        // للحفاظ على البساطة، سنفترض أنها تم إضافتها بالفعل.
        // إذا كنت تدير النقاط بشكل مختلف، فقد تحتاج إلى:
        // req.user.totalScore = (req.user.totalScore || 0) + currentRoundScore;

        await req.user.save(); // حفظ أي تغييرات محتملة أخرى

        res.status(200).json({
            message: `تم جمع ${currentRoundScore} نقطة بنجاح!`,
            user: { // إرسال بيانات المستخدم المحدثة
                username: req.user.username,
                totalScore: req.user.totalScore,
                roundsPlayed: req.user.roundsPlayed,
                autoPlayStrikes: req.user.autoPlayStrikes,
                tripleStrikes: req.user.tripleStrikes,
                hammerStrikes: req.user.hammerStrikes
            }
        });
    } catch (error) {
        console.error('Error collecting points:', error);
        res.status(500).json({ message: 'Server error collecting points.' });
    }
});


// **مسار تنفيذ إجراء اللعبة (الضربات: تلقائي، ثلاثية، مطرقة) (POST /api/game/perform-action)**
router.post('/perform-action', protect, async (req, res) => {
    const { actionType } = req.body;
    console.log(`User ${req.user.username} performing action: ${actionType}`);

    let message = '';
    let revealedBoxes = []; // مصفوفة لتخزين مؤشرات الصناديق التي تم كشفها
    let pointsEarnedFromAction = 0; // النقاط التي تم الحصول عليها من هذا الإجراء بالذات
    let boxContents = {}; // محتوى الصناديق (إذا كانت صوراً مثلاً)
    let gameOver = false;
    let gameOverStatus = null;

    try {
        switch (actionType) {
            case 'autoPlay':
                if (req.user.autoPlayStrikes <= 0) {
                    return res.status(400).json({ message: 'لا يوجد لديك ضربات تلقائية متبقية.' });
                }
                req.user.autoPlayStrikes--;
                message = 'تم تنفيذ الضربة التلقائية! كشفت صندوقاً عشوائياً.';
                // منطق الضربة التلقائية: كشف صندوق عشوائي غير مكشوف
                const availableBoxes = await findUnrevealedBoxes(); // ستحتاج إلى دالة للعثور على الصناديق غير المكشوفة
                if (availableBoxes.length > 0) {
                    const randomIndex = availableBoxes[Math.floor(Math.random() * availableBoxes.length)];
                    revealedBoxes.push(randomIndex);
                    const { points, content, isGameOver } = await revealBoxLogic(randomIndex, req.user); // منطق الكشف
                    pointsEarnedFromAction += points;
                    boxContents[randomIndex] = content;
                    if (isGameOver) { gameOver = true; gameOverStatus = 'fail'; } // مثال: إذا كان الصندوق ينهي اللعبة
                } else {
                    message = 'لا توجد صناديق متاحة للكشف التلقائي.';
                    // قد لا تحتاج هنا لخصم الضربة إذا لم يتم الكشف فعلياً
                }
                break;

            case 'tripleStrike':
                if (req.user.tripleStrikes <= 0) {
                    return res.status(400).json({ message: 'لا يوجد لديك ضربات ثلاثية متبقية.' });
                }
                req.user.tripleStrikes--;
                message = 'تم تنفيذ الضربة الثلاثية! كشفت 3 صناديق عشوائياً.';
                // منطق الضربة الثلاثية: كشف 3 صناديق عشوائية غير مكشوفة
                const availableBoxesTriple = await findUnrevealedBoxes();
                const numToReveal = Math.min(3, availableBoxesTriple.length);
                for (let i = 0; i < numToReveal; i++) {
                    const randomIndex = availableBoxesTriple.splice(Math.floor(Math.random() * availableBoxesTriple.length), 1)[0];
                    revealedBoxes.push(randomIndex);
                    const { points, content, isGameOver } = await revealBoxLogic(randomIndex, req.user);
                    pointsEarnedFromAction += points;
                    boxContents[randomIndex] = content;
                    if (isGameOver) { gameOver = true; gameOverStatus = 'fail'; }
                }
                break;

            case 'hammerStrike':
                if (req.user.hammerStrikes <= 0) {
                    return res.status(400).json({ message: 'لا يوجد لديك ضربات مطرقة متبقية.' });
                }
                req.user.hammerStrikes--;
                message = 'تم تنفيذ ضربة المطرقة! كشفت صندوق الفوز (إذا كان موجوداً).';
                // منطق ضربة المطرقة: كشف الصندوق الفائز (افتراضاً)
                const WINNING_BOX_INDEX = 50; // يجب أن يتم تعريف هذا بشكل مركزي
                const { points, content, isGameOver } = await revealBoxLogic(WINNING_BOX_INDEX, req.user);
                revealedBoxes.push(WINNING_BOX_INDEX);
                pointsEarnedFromAction += points;
                boxContents[WINNING_BOX_INDEX] = content;
                if (isGameOver) { gameOver = true; gameOverStatus = 'success'; } // المطرقة تنهي اللعبة بنجاح
                break;

            default:
                return res.status(400).json({ message: 'نوع إجراء غير صالح.' });
        }

        req.user.totalScore = (req.user.totalScore || 0) + pointsEarnedFromAction; // إضافة النقاط المكتسبة من الإجراء
        await req.user.save(); // حفظ التغييرات على المستخدم

        res.status(200).json({
            message: message,
            user: { // إرسال بيانات المستخدم المحدثة
                username: req.user.username,
                totalScore: req.user.totalScore,
                roundsPlayed: req.user.roundsPlayed,
                autoPlayStrikes: req.user.autoPlayStrikes,
                tripleStrikes: req.user.tripleStrikes,
                hammerStrikes: req.user.hammerStrikes
            },
            revealedBoxes: revealedBoxes, // إرسال مؤشرات الصناديق التي تم كشفها
            boxContents: boxContents, // محتويات هذه الصناديق
            currentScore: pointsEarnedFromAction, // النقاط التي حصل عليها من هذه الضربة
            gameOver: gameOver,
            gameOverStatus: gameOverStatus
        });

    } catch (error) {
        console.error(`Error performing ${actionType} action:`, error);
        res.status(500).json({ message: `Server error performing ${actionType} action.` });
    }
});


// **مسار إعادة تعيين اللعبة (للمشرفين فقط) (POST /api/admin/reset-game)**
// هذا المسار يجب أن يتم استدعاؤه فقط من قبل المشرفين
router.post('/admin/reset-game', protect, admin, async (req, res) => {
    try {
        // إعادة تعيين نقاط جميع المستخدمين إلى 0 (أو القيم الافتراضية)
        await User.updateMany({}, {
            totalScore: 0,
            roundsPlayed: 0,
            autoPlayStrikes: 0, // يمكنك وضع قيم افتراضية مختلفة هنا
            tripleStrikes: 0,
            hammerStrikes: 0
            // لا تعيد تعيين isAdmin أو كلمة المرور أو اسم المستخدم
        });
        res.status(200).json({ message: 'Game data reset for all users successfully!' });
    } catch (error) {
        console.error('Error resetting game data:', error);
        res.status(500).json({ message: 'Server error resetting game data.' });
    }
});

module.exports = router;


// ----------------------------------------------------
// **وظائف مساعدة داخلية (ليست مسارات API)**
// يمكنك وضعها في ملف منفصل (مثل utils/gameLogic.js) إذا أصبحت كبيرة
// ولكن لتبسيط الأمر، يمكن أن تكون هنا مؤقتاً

// وظيفة للعثور على الصناديق غير المكشوفة (افتراضياً 100 صندوق)
// في لعبة حقيقية، يجب أن يتم تخزين حالة الصناديق (مكشوفة/غير مكشوفة، محتواها) في قاعدة البيانات لكل جولة/مستخدم.
// حالياً، سنفترض أننا نختار عشوائياً من 0 إلى 99.
async function findUnrevealedBoxes() {
    // هذا الجزء سيعتمد على كيفية تخزين حالة اللعبة (الصناديق المكشوفة) في قاعدة البيانات.
    // إذا كنت لا تخزنها في قاعدة البيانات لكل جولة، فهذا مجرد اختيار عشوائي.
    // لغرض التجربة، سنعيد قائمة من جميع المؤشرات الممكنة ونفترض أن الواجهة الأمامية تتعامل مع المكشوف منها.
    const allBoxIndexes = Array.from({ length: 100 }, (_, i) => i);
    return allBoxIndexes; // في تطبيق حقيقي، ستتم تصفية هذه القائمة بناءً على الصناديق المكشوفة في قاعدة البيانات
}

// منطق الكشف عن الصندوق الفردي (يمكن استخدامه من مسار 'reveal-box' أو مسار 'perform-action')
async function revealBoxLogic(index, user) {
    const WINNING_BOX_INDEX = 50; // افتراضياً، الصندوق رقم 51
    const WINNING_POINTS = 100;
    const LOOSING_POINTS = -10;
    const NORMAL_POINTS = 5;

    let pointsEarned = 0;
    let content = null;
    let isGameOver = false; // هل هذا الكشف ينهي اللعبة؟

    if (index === WINNING_BOX_INDEX) {
        pointsEarned = WINNING_POINTS;
        content = 'gold_box.png';
        isGameOver = true; // يمكن اعتبار العثور على الفائز ينهي الجولة بنجاح
    } else if (index % 7 === 0) {
        pointsEarned = LOOSING_POINTS;
        content = 'bomb.png';
        // isGameOver = true; // يمكن اعتبار خسارة نقاط معينة تنهي اللعبة بخسارة
    } else {
        pointsEarned = NORMAL_POINTS;
        content = 'coins.png';
    }

    // هنا يمكنك تحديث نقاط المستخدم مؤقتًا
    // user.totalScore = (user.totalScore || 0) + pointsEarned;
    // (ملاحظة: حفظ المستخدم سيتم في المسار الرئيسي)

    return { points: pointsEarned, content: content, isGameOver: isGameOver };
}