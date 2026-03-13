const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware, userController.getProfil);
router.put('/me', authMiddleware, userController.updateProfil);

module.exports = router;