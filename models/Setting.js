const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Should be 'gameConfig'
    value: {
        numBoxes: { type: Number, default: 5 },
        minPrize: { type: Number, default: 10 },
        maxPrize: { type: Number, default: 100 },
        freePlay: { type: Boolean, default: false },
        playCost: { type: Number, default: 10 }
    },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedAt: { type: Date, default: Date.now }
});

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;