const { Inventory, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.createInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'Inventory',
      entityId: inventoryItem.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      inventoryItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInventoryItems = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    if (category) {
      where.category = category;
    }
    if (search) {
      where.itemName = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['itemName', 'ASC']]
    });

    res.json({
      success: true,
      inventoryItems: rows,
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

exports.getInventoryItemById = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByPk(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({
      success: true,
      inventoryItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByPk(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const oldData = { ...inventoryItem.toJSON() };
    await inventoryItem.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVENTORY_ITEM_UPDATED',
      entityType: 'Inventory',
      entityId: inventoryItem.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      inventoryItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInventoryQuantity = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    const inventoryItem = await Inventory.findByPk(req.params.id);
    
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const oldQuantity = inventoryItem.quantity;
    let newQuantity;
    
    if (operation === 'add') {
      newQuantity = oldQuantity + quantity;
    } else if (operation === 'subtract') {
      newQuantity = Math.max(0, oldQuantity - quantity);
    } else {
      newQuantity = quantity;
    }

    await inventoryItem.update({ 
      quantity: newQuantity,
      lastRestocked: operation === 'add' ? new Date() : inventoryItem.lastRestocked
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVENTORY_QUANTITY_UPDATED',
      entityType: 'Inventory',
      entityId: inventoryItem.id,
      changes: { oldQuantity, newQuantity, operation },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      inventoryItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await Inventory.findAll({
      where: {
        isActive: true,
        quantity: {
          [Op.lte]: require('sequelize').literal('"reorderLevel"')
        }
      },
      order: [['quantity', 'ASC']]
    });

    res.json({
      success: true,
      lowStockItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByPk(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await inventoryItem.update({ isActive: false });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVENTORY_ITEM_DELETED',
      entityType: 'Inventory',
      entityId: inventoryItem.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

