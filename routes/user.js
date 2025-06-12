const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth'); // سنقوم بإنشاء هذا الملف قريبا

// Get User Data
router.get('/data', authMiddleware, async (req, res) => {
    try {
        // req.user.id comes from the auth middleware
        const user = await User.findById(req.user.id).select('-password'); // Exclude password from response
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching user data', error: err.message });
    }
});

// Update User Data
router.put('/update', authMiddleware, async (req, res) => {
    const { playerCoins, luckyPoints, roundsPlayed, personalScores } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update allowed fields
        if (playerCoins !== undefined) user.playerCoins = playerCoins;
        if (luckyPoints !== undefined) user.luckyPoints = luckyPoints;
        if (roundsPlayed !== undefined) user.roundsPlayed = roundsPlayed;
        if (personalScores !== undefined) user.personalScores = personalScores;

        await user.save();
        res.json({ message: 'User data updated successfully', user: user.select('-password') });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating user data', error: err.message });
    }
});

module.exports = router;