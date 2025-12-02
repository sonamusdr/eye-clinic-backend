const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  createPayment,
  getPayments,
  processStripePayment
} = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/invoices', authenticate, authorize('admin', 'receptionist'), createInvoice);
router.get('/invoices', authenticate, getInvoices);
router.get('/invoices/:id', authenticate, getInvoiceById);
router.put('/invoices/:id', authenticate, authorize('admin', 'receptionist'), updateInvoice);
router.delete('/invoices/:id', authenticate, authorize('admin'), deleteInvoice);

router.post('/payments', authenticate, createPayment);
router.get('/payments', authenticate, getPayments);
router.post('/payments/stripe', authenticate, processStripePayment);

module.exports = router;

