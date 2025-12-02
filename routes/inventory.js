const express = require('express');
const router = express.Router();
const {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  updateInventoryQuantity
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist'), createInventoryItem);
router.get('/', authenticate, getInventoryItems);
router.get('/low-stock', authenticate, getLowStockItems);
router.get('/:id', authenticate, getInventoryItemById);
router.put('/:id', authenticate, authorize('admin', 'receptionist'), updateInventoryItem);
router.patch('/:id/quantity', authenticate, authorize('admin', 'receptionist'), updateInventoryQuantity);
router.delete('/:id', authenticate, authorize('admin'), deleteInventoryItem);

module.exports = router;

