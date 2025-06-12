const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const User = require('../models/User'); // للاستخدام في lastUpdatedBy
const authMiddleware = require('../middleware/auth'); // سنقوم بإنشاء هذا الملف قريبا

// Get Global Game Settings
router.get('/settings', async (req, res) => { // This can be accessed by anyone (frontend needs to load it)
    try {
        const gameConfig = await Setting.findOne({ name: 'gameConfig' });
        if (!gameConfig) {
            return res.status(404).json({ message: 'Game settings not found' });
        }
        res.json(gameConfig.value);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching game settings', error: err.message });
    }
});

// Update Global Game Settings (Admin only)
router.put('/settings', authMiddleware, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    try {
        const updatedSettings = req.body;
        const gameConfig = await Setting.findOneAndUpdate(
            { name: 'gameConfig' },
            {
                $set: {
                    value: updatedSettings,
                    lastUpdatedBy: req.user.id,
                    lastUpdatedAt: Date.now()
                }
            },
            { new: true, upsert: true } // upsert: true will create if not found
        );
        res.json({ message: 'Global settings updated successfully', settings: gameConfig.value });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating game settings', error: err.message });
    }
});

module.exports = router;