const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendEmail = require('../helpers/mailer');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Specify your upload destination
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const fileTypes = /jpeg|jpg|png|gif/; // Allowed file types
      const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = fileTypes.test(file.mimetype);
  
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('Error: File type not allowed!'));
    },
  });
    

// Helper to generate JWT tokens
const generateToken = (user, expiresIn) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const createUser = (req, res) => {
    upload.single('photo')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
  
        try {
            const { name, email, phoneNumber, address, role, status, password } = req.body;

            const newUser = new User({
                name,
                email,
                phoneNumber,
                address,
                role,
                status,
                password, // Make sure this is hashed if necessary
            });

            // Set activeStart and activeEnd if role is Admin
            if (role === 'Admin') {
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                
                newUser.activeStart = startOfDay;
                newUser.activeEnd = endOfDay;
            }
  
            if (req.file) {
                newUser.photo = req.file.filename;
            }
  
            await newUser.save();
            res.status(201).json({ message: 'User created successfully', user: newUser });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
};

  

// User login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user, '1h');
    const refreshToken = generateToken(user, '7d');

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        address: user.address,
        photo: user.photo,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
};

// Refresh token
const refreshTokenHandler = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh token required' });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateToken(user, '1h');
    res.json({ token: newAccessToken });
  });
};

// Get users with pagination, search functionality, and role filter
const getUsers = async (req, res) => {
    try {
      const { page = 1, limit = 5, search = '', role } = req.query;
      
      // Build search query with case-insensitive regex for name, email, and phoneNumber
      let searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ]
      };
  
      // Add role filter if provided
      if (role) {
        searchQuery = {
          ...searchQuery,
          role: role // Filter by the specific role (SuperAdmin, Admin, User)
        };
      }
  
      // Fetch users with pagination, search, and optional role filter
      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name email phoneNumber role photo status address'); // Added address field
  
      const totalUsers = await User.countDocuments(searchQuery);
  
      res.json({
        users,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        totalUsers,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users', error });
    }
  };
  

// Get user by ID with role
const getUserById = async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('name email role photo address'); // Added address field
  
      if (user) {
        res.json({
          ...user.toObject(),
          photo: user.photo ? `${req.protocol}://${req.get('host')}/${user.photo}` : null,
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  


  const getUsersByRoleSuperAdmin = async (req, res) => {
    try {
      const { page = 1, limit = 5, search = '' } = req.query;
  
      // Ensure role is "SuperAdmin"
      const role = "SuperAdmin";
  
      let searchQuery = {
        role, // Add role to the search query
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ]
      };
  
      // Fetch users by role with pagination and search
      const users = await User.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name email phoneNumber role photo status address'); // Added address field
  
      const totalUsers = await User.countDocuments(searchQuery);
  
      // Send the response with paginated users
      res.json({
        users,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: Number(page), // Convert page to a number
        totalUsers,
      });
    } catch (error) {
      console.error('Error fetching users by role:', error);
      res.status(500).json({ message: 'Error fetching users by role', error });
    }
  };
  
  
  
// Get users by role with pagination and search functionality
const getUsersByRoleAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 5, search = '' } = req.query;
    
        // Ensure role is "Admin"
        const role = "Admin";
    
        let searchQuery = {
          role, // Add role to the search query
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
          ]
        };
    
        // Fetch users by role with pagination and search
        const users = await User.find(searchQuery)
          .skip((page - 1) * limit)
          .limit(limit)
          .select('name email phoneNumber role photo status address activeStart activeEnd'); // Added address field
    
        const totalUsers = await User.countDocuments(searchQuery);
    
        // Send the response with paginated users
        res.json({
          users,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: Number(page), // Convert page to a number
          totalUsers,
        });
      } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ message: 'Error fetching users by role', error });
      }
  };
  
// Get users by role with pagination and search functionality
const getUsersByRoleUser = async (req, res) => {
    try {
        const { page = 1, limit = 5, search = '' } = req.query;
    
        // Ensure role is "User"
        const role = "User";
    
        let searchQuery = {
          role, // Add role to the search query
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
          ]
        };
    
        // Fetch users by role with pagination and search
        const users = await User.find(searchQuery)
          .skip((page - 1) * limit)
          .limit(limit)
          .select('name email phoneNumber role photo status address'); // Added address field
    
        const totalUsers = await User.countDocuments(searchQuery);
    
        // Send the response with paginated users
        res.json({
          users,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: Number(page), // Convert page to a number
          totalUsers,
        });
      } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ message: 'Error fetching users by role', error });
      }
  };
  
// Update user by ID 
const updateUserById = (req, res) => {
    upload.single('photo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
  
      try {
        const { id } = req.params;
        const updatedUserData = {
          name: req.body.name,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          address: req.body.address,
          role: req.body.role,
          status: req.body.status,
          activeStart: req.body.activeStart, // Add activeStart field
          activeEnd: req.body.activeEnd,     // Add activeEnd field
        };
  
        // Check if photo file was uploaded and include it
        if (req.file) {
          updatedUserData.photo = req.file.filename; // Add the uploaded photo filename to user data
        }
  
        // Find the user by ID and update
        const updatedUser = await User.findByIdAndUpdate(id, updatedUserData, { new: true });
        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
        }
  
        res.status(200).json(updatedUser);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
  };

const updateUserPhoto = async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update user's photo path
      if (req.file) {
        user.photo = req.file.path; // Store the file path of the uploaded photo
      }
  
      await user.save(); // Save the updated user
  
      res.json({ message: 'User photo updated successfully', photo: user.photo });
    } catch (error) {
      console.error('Error updating user photo:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optionally delete uploaded photo file here if needed
    if (user.photo) {
      fs.unlinkSync(user.photo);
    }

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    user.passwordResetCode = resetCode;
    await user.save();

    await sendEmail(user.email, 'Password Reset Request', `Your password reset code is ${resetCode}`);

    res.json({ message: 'Password reset code sent successfully' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ message: 'Error sending password reset email', error });
  }
};

module.exports = {
    createUser,
    loginUser,
    getUsers,
    getUserById,
    getUsersByRoleSuperAdmin,
    getUsersByRoleAdmin,
    getUsersByRoleUser,
    updateUserById,
    updateUserPhoto,
    deleteUser,
    requestPasswordReset,
   
};
