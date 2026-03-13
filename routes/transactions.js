const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', 
  authMiddleware, 
  roleMiddleware('admin'), 
  transactionController.listerTransactions
);

module.exports = router;