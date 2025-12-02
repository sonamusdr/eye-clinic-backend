const { Invoice, Payment, Patient, AuditLog } = require('../models');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createInvoice = async (req, res) => {
  try {
    const { patientId, items, tax = 0, discount = 0, insuranceCoverage = 0, notes } = req.body;

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + tax - discount - insuranceCoverage;
    const coPayment = total;

    // Generate invoice number
    const invoiceCount = await Invoice.count();
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      items,
      subtotal,
      tax,
      discount,
      insuranceCoverage,
      coPayment,
      total,
      notes,
      status: 'pending'
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { patientId, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) {
      where.patientId = patientId;
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Patient, attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      invoices: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Patient }]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const oldData = { ...invoice.toJSON() };
    
    // Recalculate if items changed
    if (req.body.items) {
      const subtotal = req.body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal + (req.body.tax || invoice.tax) - (req.body.discount || invoice.discount) - (req.body.insuranceCoverage || invoice.insuranceCoverage);
      req.body.subtotal = subtotal;
      req.body.total = total;
      req.body.coPayment = total;
    }

    await invoice.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_UPDATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await invoice.update({ status: 'cancelled' });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVOICE_CANCELLED',
      entityType: 'Invoice',
      entityId: invoice.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Invoice cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, notes } = req.body;

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payment = await Payment.create({
      invoiceId,
      amount,
      paymentMethod,
      notes,
      status: 'completed'
    });

    // Update invoice status
    const totalPaid = await Payment.sum('amount', { where: { invoiceId, status: 'completed' } });
    let newStatus = 'pending';
    if (totalPaid >= invoice.total) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    await invoice.update({ status: newStatus });

    await AuditLog.create({
      userId: req.user.id,
      action: 'PAYMENT_CREATED',
      entityType: 'Payment',
      entityId: payment.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { invoiceId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [{ model: Invoice, include: [{ model: Patient }] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      payments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.processStripePayment = async (req, res) => {
  try {
    const { invoiceId, token } = req.body;

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Create Stripe charge
    const charge = await stripe.charges.create({
      amount: Math.round(invoice.total * 100), // Convert to cents
      currency: 'usd',
      source: token,
      description: `Payment for invoice ${invoice.invoiceNumber}`
    });

    // Create payment record
    const payment = await Payment.create({
      invoiceId,
      amount: invoice.total,
      paymentMethod: 'stripe',
      transactionId: charge.id,
      status: charge.status === 'succeeded' ? 'completed' : 'failed'
    });

    if (charge.status === 'succeeded') {
      await invoice.update({ status: 'paid' });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'STRIPE_PAYMENT_PROCESSED',
      entityType: 'Payment',
      entityId: payment.id,
      changes: { chargeId: charge.id, amount: invoice.total },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: charge.status === 'succeeded',
      payment,
      charge
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

