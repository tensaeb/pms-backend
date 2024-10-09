const express = require('express');

const {
    createUser,
    loginUser,
    getUsers,
    getUserById,
    updateUserById,
    updateUserPhoto,
    deleteUser,
    requestPasswordReset,
    getUsersByRoleSuperAdmin,
    getUsersByRoleAdmin,
    getUsersByRoleUser,
    // resetPassword,
} = require('../controllers/userController');
const { protect, admin, superAdmin, checkUserActive } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

const router = express.Router();

// CREATE new user (Only Admin or SuperAdmin)
router.post('/admin', protect, superAdmin, createUser );
router.post('/superadmin', protect, superAdmin, createUser);
router.post('/', protect, createUser);

router.post('/login', loginUser); // Add login route
// GET all users (Only Admin or SuperAdmin)
router.get('/superadmin', protect, superAdmin, getUsersByRoleSuperAdmin);
router.get('/admin', protect, getUsersByRoleAdmin);
router.get('/user', protect, getUsersByRoleUser);
router.get('/', protect, getUsers);
// GET single user (Admin can get any user, users can only get their own info)
router.get('/:id', protect, getUserById);

// UPDATE user (Admin, SuperAdmin, or the user can update)
router.put('/:id', protect, updateUserById);
router.put('/:id/photo', upload.single('photo'), updateUserPhoto); // This handles PUT /api/users/:id/photo

// DELETE user (Only SuperAdmin can delete a user)
router.delete('/:id', protect, deleteUser);

// REQUEST PASSWORD RESET
router.post('/request-password-reset', requestPasswordReset);

// RESET PASSWORD
// router.post('/reset-password', resetPassword);

module.exports = router;
