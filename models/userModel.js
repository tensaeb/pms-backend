const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['User', 'Admin', 'SuperAdmin'], 
        default: 'User',
    },      
    phoneNumber: { type: String },
    address: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    photo: { type: String },
    resetCode: { type: String },
    resetCodeExpiration: { type: Date },
    activeStart: { type: Date }, // New field
    activeEnd: { type: Date },   // New field
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;