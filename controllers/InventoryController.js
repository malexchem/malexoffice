const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');

// Create a new inventory item
exports.createItem = async (req, res) => {
  try {
    const {
      itemCode,
      itemName,
      category,
      description,
      unitOfMeasure,
      brand,
      currentQuantity,
      minStockLevel,
      maxStockLevel,
      costPrice,
      sellingPrice,
      hasDiscount,
      discountPrice,
      warehouseName,
      shelfLocation,
      supplierName,
      supplierContact,
      lastPurchaseDate,
      lastPurchasePrice,
      notes
    } = req.body;

    // Check if item code already exists
    const existingItem = await Inventory.findOne({ itemCode: itemCode.toUpperCase() });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'Item with this code already exists'
      });
    }

    const newItem = new Inventory({
      itemCode: itemCode.toUpperCase(),
      itemName,
      category,
      description: description || null,
      unitOfMeasure,
      brand: brand || null,
      currentQuantity: currentQuantity || 0,
      minStockLevel,
      maxStockLevel: maxStockLevel || null,
      costPrice,
      sellingPrice,
      hasDiscount: hasDiscount || false,
      discountPrice: discountPrice || null,
      warehouseName,
      shelfLocation: shelfLocation || null,
      supplierName: supplierName || null,
      supplierContact: supplierContact || null,
      lastPurchaseDate: lastPurchaseDate ? new Date(lastPurchaseDate) : null,
      lastPurchasePrice: lastPurchasePrice || null,
      notes: notes || null
    });

    await newItem.save();

    // Log the initial inventory movement
    if (currentQuantity > 0) {
      const movement = new InventoryMovement({
        itemId: newItem.id,
        itemCode: newItem.itemCode,
        itemName: newItem.itemName,
        movementType: 'in',
        quantity: currentQuantity,
        previousQuantity: 0,
        newQuantity: currentQuantity,
        reason: 'Initial stock',
        responsiblePerson: req.user?.name || 'System',
        notes: 'Initial inventory setup'
      });
      await movement.save();
    }

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: newItem
    });

  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all inventory items with pagination and filtering
exports.getAllItems = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Text search
    if (req.query.search) {
      filter.$or = [
        { itemCode: { $regex: req.query.search, $options: 'i' } },
        { itemName: { $regex: req.query.search, $options: 'i' } },
        { category: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    // Filter by category
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    
    // Filter by warehouse
    if (req.query.warehouse && req.query.warehouse !== 'all') {
      filter.warehouseName = req.query.warehouse;
    }
    
    // Filter low stock items
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lte: ['$currentQuantity', '$minStockLevel'] };
    }
    
    // Filter out of stock items
    if (req.query.outOfStock === 'true') {
      filter.currentQuantity = 0;
    }

    const [items, total] = await Promise.all([
      Inventory.find(filter)
        .sort({ itemCode: 1 })
        .skip(skip)
        .limit(limit),
      Inventory.countDocuments(filter)
    ]);

    const hasMore = skip + items.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: items
    });

  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Inventory.findOne({ id: req.params.id });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.itemCode;
    delete updates.createdAt;
    
    // Convert item code to uppercase if provided
    if (updates.itemCode) {
      updates.itemCode = updates.itemCode.toUpperCase();
    }

    const item = await Inventory.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ id: req.params.id });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Also delete related movements
    await InventoryMovement.deleteMany({ itemId: req.params.id });

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { movementType, quantity, reason, referenceNumber, notes } = req.body;
    const itemId = req.params.id;

    // Find the item
    const item = await Inventory.findOne({ id: itemId });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    const previousQuantity = item.currentQuantity;
    let newQuantity = previousQuantity;

    // Calculate new quantity based on movement type
    switch (movementType) {
      case 'in':
      case 'return':
        newQuantity = previousQuantity + quantity;
        break;
      case 'out':
        if (quantity > previousQuantity) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient stock available'
          });
        }
        newQuantity = previousQuantity - quantity;
        break;
      case 'adjustment':
        newQuantity = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid movement type'
        });
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative'
      });
    }

    // Update item quantity
    item.currentQuantity = newQuantity;
    await item.save();

    // Log the movement
    const movement = new InventoryMovement({
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      movementType,
      quantity: Math.abs(quantity),
      previousQuantity,
      newQuantity,
      reason,
      responsiblePerson: req.user?.name || 'System',
      referenceNumber: referenceNumber || null,
      notes: notes || null
    });
    await movement.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        item,
        movement
      }
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get inventory statistics
exports.getInventoryStats = async (req, res) => {
  try {
    const [
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      totalCategories,
      totalWarehouses
    ] = await Promise.all([
      Inventory.countDocuments(),
      Inventory.aggregate([
        { $group: { _id: null, total: { $sum: '$totalValue' } } }
      ]),
      Inventory.countDocuments({ $expr: { $lte: ['$currentQuantity', '$minStockLevel'] } }),
      Inventory.countDocuments({ currentQuantity: 0 }),
      Inventory.distinct('category').then(categories => categories.length),
      Inventory.distinct('warehouseName').then(warehouses => warehouses.length)
    ]);

    // Get category distribution
    const categoryStats = await Inventory.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$totalValue' } } },
      { $sort: { count: -1 } }
    ]);

    // Get status distribution
    const statusStats = await Inventory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get top items by value
    const topItemsByValue = await Inventory.find()
      .sort({ totalValue: -1 })
      .limit(5)
      .select('itemCode itemName currentQuantity totalValue');

    res.json({
      success: true,
      data: {
        totals: {
          items: totalItems,
          value: totalValue[0]?.total || 0,
          lowStock: lowStockItems,
          outOfStock: outOfStockItems,
          categories: totalCategories,
          warehouses: totalWarehouses
        },
        distributions: {
          categories: categoryStats,
          status: statusStats
        },
        topItems: topItemsByValue,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get inventory movements for an item
exports.getItemMovements = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      InventoryMovement.find({ itemId: req.params.id })
        .sort({ movementDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryMovement.countDocuments({ itemId: req.params.id })
    ]);

    const hasMore = skip + movements.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: movements
    });

  } catch (error) {
    console.error('Error fetching item movements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all movements
exports.getAllMovements = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.itemCode) {
      filter.itemCode = { $regex: req.query.itemCode, $options: 'i' };
    }
    
    if (req.query.movementType && req.query.movementType !== 'all') {
      filter.movementType = req.query.movementType;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.movementDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate + 'T23:59:59.999Z')
      };
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .sort({ movementDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryMovement.countDocuments(filter)
    ]);

    const hasMore = skip + movements.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: movements
    });

  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search inventory items
exports.searchItems = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const items = await Inventory.find({
      $or: [
        { itemCode: { $regex: query, $options: 'i' } },
        { itemName: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).limit(50);

    res.json({
      success: true,
      data: items
    });

  } catch (error) {
    console.error('Error searching inventory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Inventory.distinct('category');
    res.json({
      success: true,
      data: categories.filter(cat => cat).sort()
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get warehouses
exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Inventory.distinct('warehouseName');
    res.json({
      success: true,
      data: warehouses.filter(wh => wh).sort()
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};