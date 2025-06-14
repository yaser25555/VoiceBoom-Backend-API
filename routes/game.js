// backend/routes/game.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware'); // استيراد الـ middleware
const User = require('../models/User'); // استيراد نموذج المستخدم

// دالة مساعدة لتوليد حالة الصناديق الأولية (إذا لم تكن معرفة بالفعل)
const generateInitialBoxes = (numBoxes) => {
    // هذه مجرد دالة افتراضية، يمكنك تعديلها لإنشاء صناديق ذات قيم حقيقية أو مختلفة.
    // حالياً، فقط تعيد مصفوفة فارغة لتمثل حالة الصناديق.
    // في تطبيقك، قد ترغب في تحديد الصناديق الفائزة والخاسرة هنا.
    // على سبيل المثال، 100 صندوق، 5 منها فائزة، 5 قنابل، والبقية عادية.
    const boxes = [];
    for (let i = 0; i < numBoxes; i++) {
        boxes.push({ index: i, type: 'normal', value: 5, revealed: false });
    }
    // مثال: تحديد صندوق فائز واحد وصندوق قنبلة واحد
    boxes[50].type = 'win'; // الصندوق رقم 51
    boxes[50].value = 100;
    boxes[10].type = 'bomb'; // الصندوق رقم 11
    boxes[10].value = -10;
    return boxes;
};


// **مسار جلب بيانات المستخدم (GET /api/user/me)**
// هذا المسار سيستخدمه الواجهة الأمامية (game.html) لجلب بيانات المستخدم المحدثة عند تحميل الصفحة
router.get('/user/me', protect, async (req, res) => {
    console.log('User Me Route: Entered handler'); // <-- log جديد
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
        console.log('User Me Route: Response sent'); // <-- log جديد
    } catch (error) {
        console.error('User Me Route: Error fetching user data:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error fetching user data.' });
    }
});

// **مسار بدء جولة جديدة (POST /api/game/start-round)**
router.post('/start-round', protect, async (req, res) => {
    console.log('Start Round Route: Entered handler'); // <-- log جديد
    try {
        const user = req.user; // المستخدم من الـ middleware
        if (!user) {
            console.log('Start Round Route: User not found after protect middleware'); // <-- log جديد
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        // منطق اللعبة
        const initialScore = 0;
        const totalBoxes = 100; // عدد الصناديق الكلي
        const initialBoxesState = generateInitialBoxes(totalBoxes); // توليد حالة الصناديق

        user.currentRound = {
            score: initialScore,
            boxesState: initialBoxesState,
            revealedBoxes: [],
            strikesUsed: { autoPlay: 0, tripleStrike: 0, hammerStrike: 0 }
        };
        user.roundsPlayed = (user.roundsPlayed || 0) + 1; // زيادة عدد الجولات الملعوبة

        // لا تنسى تحديث تاريخ آخر لعب
        user.lastPlayed = new Date(); // تحديث تاريخ آخر لعب

        await user.save();
        console.log('Start Round Route: User saved successfully'); // <-- log جديد

        res.status(200).json({
            message: 'جولة جديدة بدأت بنجاح!',
            user: { // إرسال بيانات المستخدم المحدثة للواجهة الأمامية
                username: user.username,
                totalScore: user.totalScore,
                roundsPlayed: user.roundsPlayed,
                autoPlayStrikes: user.autoPlayStrikes,
                tripleStrikes: user.tripleStrikes,
                hammerStrikes: user.hammerStrikes,
                isAdmin: user.isAdmin
            },
            roundData: {
                currentRoundScore: user.currentRound.score,
                // يمكنك إرسال معلومات أخرى عن الجولة إذا لزم الأمر
            }
        });
        console.log('Start Round Route: Response sent'); // <-- log جديد

    } catch (error) {
        console.error('Start Round Route: Error:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error starting new round.' });
    }
});

// منطق الكشف عن الصندوق الفردي (يمكن استخدامه من مسار 'reveal-box' أو مسار 'perform-action')
// هذا كود مساعد ولا يحتاج لأن يكون مسار API
async function revealBoxLogic(index, user) {
    if (index < 0 || index >= user.currentRound.boxesState.length) {
        throw new Error('Invalid box index.');
    }

    let box = user.currentRound.boxesState[index];

    if (box.revealed) {
        // إذا كان الصندوق مكشوفاً بالفعل، لا تفعل شيئاً أو أرسل رسالة مناسبة
        return { message: 'الصندوق مكشوف بالفعل.', currentScore: 0, boxContent: null, gameOver: false };
    }

    box.revealed = true; // ضع علامة على الصندوق كمكشوف

    let pointsEarned = box.value; // النقاط المكتسبة من هذا الصندوق
    let content = null;
    let isGameOver = false; // هل هذا الكشف ينهي اللعبة؟
    let gameOverStatus = null; // 'success' or 'fail'

    // تحديد محتوى الصندوق بناءً على نوعه
    if (box.type === 'win') {
        content = 'gold_box.png';
        isGameOver = true; // الفوز ينهي الجولة
        gameOverStatus = 'success';
    } else if (box.type === 'bomb') {
        content = 'bomb.png';
        isGameOver = true; // القنبلة تنهي الجولة
        gameOverStatus = 'fail';
    } else { // normal box
        content = 'normal_box.png'; // أو أي صورة افتراضية
    }

    user.currentRound.score += pointsEarned; // أضف النقاط إلى نقاط الجولة الحالية
    user.totalScore += pointsEarned; // أضف النقاط إلى النقاط الكلية
    user.currentRound.revealedBoxes.push(index); // تتبع الصناديق المكشوفة

    // حفظ التغييرات في قاعدة البيانات
    await user.save();

    return {
        message: `لقد كشفت صندوق ${box.type === 'win' ? 'الفوز!' : box.type === 'bomb' ? 'القنبلة!' : 'عادي'}. النقاط: ${pointsEarned}`,
        currentScore: pointsEarned,
        boxContent: content,
        gameOver: isGameOver,
        gameOverStatus: gameOverStatus
    };
}


// **مسار الكشف عن الصندوق (POST /api/game/reveal-box)**
router.post('/reveal-box', protect, async (req, res) => {
    console.log('Reveal Box Route: Entered handler'); // <-- log جديد
    const { boxIndex } = req.body;

    try {
        const user = req.user;
        if (!user || !user.currentRound || !user.currentRound.boxesState) {
            console.log('Reveal Box Route: User or current round data missing'); // <-- log جديد
            return res.status(400).json({ message: 'Game not started or round data missing.' });
        }

        // تحقق مما إذا كان الصندوق مكشوفاً بالفعل
        if (user.currentRound.revealedBoxes.includes(boxIndex)) {
            console.log('Reveal Box Route: Box already revealed', boxIndex); // <-- log جديد
            return res.status(400).json({ message: 'هذا الصندوق تم كشفه بالفعل.' });
        }

        const result = await revealBoxLogic(boxIndex, user);
        console.log('Reveal Box Route: Logic executed, sending response', result); // <-- log جديد
        res.status(200).json({
            message: result.message,
            currentScore: result.currentScore,
            boxContent: result.boxContent,
            user: { // إرسال بيانات المستخدم المحدثة
                username: user.username,
                totalScore: user.totalScore,
                roundsPlayed: user.roundsPlayed,
                autoPlayStrikes: user.autoPlayStrikes,
                tripleStrikes: user.tripleStrikes,
                hammerStrikes: user.hammerStrikes,
                isAdmin: user.isAdmin
            },
            gameOver: result.gameOver,
            gameOverStatus: result.gameOverStatus
        });

    } catch (error) {
        console.error('Reveal Box Route: Error:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error revealing box.' });
    }
});

// **مسار جمع النقاط (POST /api/game/collect-points)**
router.post('/collect-points', protect, async (req, res) => {
    console.log('Collect Points Route: Entered handler'); // <-- log جديد
    try {
        const user = req.user;

        if (!user || !user.currentRound) {
            console.log('Collect Points Route: User or current round data missing'); // <-- log جديد
            return res.status(400).json({ message: 'No active game to collect points from.' });
        }

        // لا تحتاج لـ currentRoundScore في الـ body، لأنه موجود في user.currentRound.score
        const collectedScore = user.currentRound.score;

        if (collectedScore === 0) {
            console.log('Collect Points Route: No points to collect'); // <-- log جديد
            return res.status(400).json({ message: 'لا توجد نقاط لجمعها في هذه الجولة.' });
        }

        // تم بالفعل تحديث totalScore و currentRound.score في revealBoxLogic
        // هنا نقوم بإنهاء الجولة وإعادة تعيين currentRound
        user.currentRound = {
            score: 0,
            boxesState: [],
            revealedBoxes: [],
            strikesUsed: { autoPlay: 0, tripleStrike: 0, hammerStrike: 0 }
        };

        await user.save();
        console.log('Collect Points Route: Points collected and user saved'); // <-- log جديد

        res.status(200).json({
            message: `تم جمع ${collectedScore} نقطة بنجاح!`,
            user: {
                username: user.username,
                totalScore: user.totalScore,
                roundsPlayed: user.roundsPlayed,
                autoPlayStrikes: user.autoPlayStrikes,
                tripleStrikes: user.tripleStrikes,
                hammerStrikes: user.hammerStrikes,
                isAdmin: user.isAdmin
            },
            collectedScore: collectedScore
        });
        console.log('Collect Points Route: Response sent'); // <-- log جديد

    } catch (error) {
        console.error('Collect Points Route: Error:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error collecting points.' });
    }
});


// **مسار تنفيذ إجراء اللعبة (الضربات: تلقائي، ثلاثية، مطرقة) (POST /api/game/perform-action)**
router.post('/perform-action', protect, async (req, res) => {
    console.log('Perform Action Route: Entered handler'); // <-- log جديد
    const { actionType } = req.body;
    let revealedIndexes = []; // لتتبع الصناديق التي تم كشفها بهذا الإجراء
    let totalPointsEarned = 0;
    let newBoxContents = {}; // لتخزين محتوى الصناديق الجديدة
    let isGameOver = false;
    let gameOverStatus = null;

    try {
        const user = req.user;
        if (!user || !user.currentRound || !user.currentRound.boxesState) {
            console.log('Perform Action Route: User or current round data missing'); // <-- log جديد
            return res.status(400).json({ message: 'Game not started or round data missing.' });
        }

        switch (actionType) {
            case 'autoPlay':
                if (user.autoPlayStrikes <= 0) {
                    console.log('Perform Action Route: No autoPlay strikes left'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد ضربات تلقائية متبقية.' });
                }
                // ابحث عن صندوق غير مكشوف بشكل عشوائي وكشفه
                const unrevealedBoxes = user.currentRound.boxesState.filter(box => !box.revealed);
                if (unrevealedBoxes.length === 0) {
                    console.log('Perform Action Route: No unrevealed boxes for autoPlay'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد صناديق غير مكشوفة لتشغيل الضربة التلقائية.' });
                }
                const randomIndex = Math.floor(Math.random() * unrevealedBoxes.length);
                const boxToReveal = unrevealedBoxes[randomIndex];
                const resultAuto = await revealBoxLogic(boxToReveal.index, user);
                totalPointsEarned = resultAuto.currentScore;
                revealedIndexes.push(boxToReveal.index);
                newBoxContents[boxToReveal.index] = resultAuto.boxContent;
                isGameOver = resultAuto.gameOver;
                gameOverStatus = resultAuto.gameOverStatus;
                user.autoPlayStrikes--;
                break;

            case 'tripleStrike':
                if (user.tripleStrikes <= 0) {
                    console.log('Perform Action Route: No triple strikes left'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد ضربات ثلاثية متبقية.' });
                }
                // كشف 3 صناديق عشوائية غير مكشوفة
                const unrevealedForTriple = user.currentRound.boxesState.filter(box => !box.revealed);
                if (unrevealedForTriple.length < 3) {
                     console.log('Perform Action Route: Not enough unrevealed boxes for tripleStrike'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد صناديق كافية غير مكشوفة للضربة الثلاثية.' });
                }
                for (let i = 0; i < 3; i++) {
                    const randomTripleIndex = Math.floor(Math.random() * unrevealedForTriple.length);
                    const tripleBoxToReveal = unrevealedForTriple.splice(randomTripleIndex, 1)[0]; // إزالة الصندوق المختار
                    const resultTriple = await revealBoxLogic(tripleBoxToReveal.index, user);
                    totalPointsEarned += resultTriple.currentScore;
                    revealedIndexes.push(tripleBoxToReveal.index);
                    newBoxContents[tripleBoxToReveal.index] = resultTriple.boxContent;
                    if (resultTriple.gameOver) { isGameOver = true; gameOverStatus = resultTriple.gameOverStatus; }
                }
                user.tripleStrikes--;
                break;

            case 'hammerStrike':
                if (user.hammerStrikes <= 0) {
                    console.log('Perform Action Route: No hammer strikes left'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد ضربات مطرقة متبقية.' });
                }
                // كشف الصندوق الأقل قيمة (إذا كان هناك واحد)
                const unrevealedForHammer = user.currentRound.boxesState.filter(box => !box.revealed);
                if (unrevealedForHammer.length === 0) {
                     console.log('Perform Action Route: No unrevealed boxes for hammerStrike'); // <-- log جديد
                    return res.status(400).json({ message: 'لا توجد صناديق غير مكشوفة لضربة المطرقة.' });
                }
                // ابحث عن الصندوق الذي يحتوي على أقل قيمة (أو القنبلة إذا كانت موجودة)
                // بناءً على منطق generateInitialBoxes، القنبلة هي -10
                let minValBox = unrevealedForHammer[0];
                for(let i=1; i<unrevealedForHammer.length; i++) {
                    if (unrevealedForHammer[i].value < minValBox.value) {
                        minValBox = unrevealedForHammer[i];
                    }
                }
                const resultHammer = await revealBoxLogic(minValBox.index, user);
                totalPointsEarned = resultHammer.currentScore;
                revealedIndexes.push(minValBox.index);
                newBoxContents[minValBox.index] = resultHammer.boxContent;
                isGameOver = resultHammer.gameOver;
                gameOverStatus = resultHammer.gameOverStatus;
                user.hammerStrikes--;
                break;

            default:
                console.log('Perform Action Route: Invalid action type', actionType); // <-- log جديد
                return res.status(400).json({ message: 'نوع الإجراء غير صالح.' });
        }

        // حفظ التغييرات في قاعدة البيانات بعد استخدام الضربة
        await user.save();
        console.log('Perform Action Route: Action executed and user saved'); // <-- log جديد

        res.status(200).json({
            message: `تم تنفيذ ${actionType} بنجاح!`,
            user: {
                username: user.username,
                totalScore: user.totalScore,
                roundsPlayed: user.roundsPlayed,
                autoPlayStrikes: user.autoPlayStrikes,
                tripleStrikes: user.tripleStrikes,
                hammerStrikes: user.hammerStrikes,
                isAdmin: user.isAdmin
            },
            revealedBoxes: revealedIndexes, // إرجاع مؤشرات الصناديق التي تم كشفها
            boxContents: newBoxContents,   // إرجاع محتوى الصناديق المكتشفة
            currentScore: totalPointsEarned, // النقاط المكتسبة من هذه الضربة
            gameOver: isGameOver,
            gameOverStatus: gameOverStatus
        });
        console.log('Perform Action Route: Response sent'); // <-- log جديد

    } catch (error) {
        console.error('Perform Action Route: Error:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error performing action.' });
    }
});


// **مسار إعادة تعيين اللعبة (للمشرفين فقط) (POST /api/admin/reset-game)**
router.post('/admin/reset-game', protect, admin, async (req, res) => {
    console.log('Admin Reset Game Route: Entered handler'); // <-- log جديد
    try {
        // إعادة تعيين نقاط وضربات جميع المستخدمين
        await User.updateMany({}, {
            totalScore: 0,
            roundsPlayed: 0,
            autoPlayStrikes: 3, // عدد البدء
            tripleStrikes: 2,   // عدد البدء
            hammerStrikes: 1,   // عدد البدء
            currentRound: {
                score: 0,
                boxesState: [],
                revealedBoxes: [],
                strikesUsed: { autoPlay: 0, tripleStrike: 0, hammerStrike: 0 }
            }
        });
        console.log('Admin Reset Game Route: All users reset successfully'); // <-- log جديد
        res.status(200).json({ message: 'تمت إعادة تعيين بيانات اللعبة لجميع المستخدمين بنجاح!' });
    } catch (error) {
        console.error('Admin Reset Game Route: Error:', error); // <-- log جديد
        res.status(500).json({ message: 'Server error resetting game data.' });
    }
});

module.exports = router;