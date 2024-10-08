const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Middleware to protect routes (JWT authentication)
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Check if the user is an Admin
const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Check if the user is a SuperAdmin
const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a SuperAdmin' });
  }
};

const checkUserActive = async (req, res, next) => {
    const userId = req.params.userId; // Assuming you pass user ID in the route
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();

    if (user.role === 'Admin') {
        if (user.activeEnd && now > user.activeEnd) {
            user.status = 'Inactive';
            await user.save();
            return res.status(403).json({ message: 'Account has expired.' });
        }
    }

    next(); // Proceed to the next middleware or route handler
};


module.exports = { protect, admin, superAdmin, checkUserActive};
