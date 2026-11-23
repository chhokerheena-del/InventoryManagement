const Product = require("../model/Product");
const mongoose = require("mongoose");

// CREATE a product
exports.createProduct = async (req, res, next) => {
    try {
        const product = new Product(req.body);
        const savedProduct = await product.save();

        res.status(201).json(savedProduct);
    } catch (error) {
        next(error);
    }
};

// GET all products with filtering, sorting and pagination
exports.getProducts = async (req, res, next) => {
    try {
        const {
            category,
            search,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 10
        } = req.query;

        const filter = {};

        // Filter by category
        if (category) {
            filter.category = category;
        }

        // Search by product name or SKU
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } }
            ];
        }

        // Filter by minimum and maximum price
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        // Select sorting order
        let sortOption = { createdAt: -1 };

        if (sort === "price_asc") {
            sortOption = { price: 1 };
        } else if (sort === "price_desc") {
            sortOption = { price: -1 };
        } else if (sort === "name_asc") {
            sortOption = { name: 1 };
        } else if (sort === "name_desc") {
            sortOption = { name: -1 };
        }

        // Set page and limit
        const currentPage = Math.max(1, parseInt(page) || 1);
        const perPage = Math.min(100, Math.max(1, parseInt(limit) || 10));

        const total = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            total,
            page: currentPage,
            totalPages: Math.ceil(total / perPage),
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

// GET one product by ID
exports.getProductById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// UPDATE product details
exports.updateProduct = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// DELETE a product
exports.deleteProduct = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product deleted",
            id: product._id
        });
    } catch (error) {
        next(error);
    }
};

// GET products where quantity is at or below reorder level
exports.getLowStock = async (req, res, next) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$reorderLevel"]
            }
        });

        res.status(200).json({
            count: products.length,
            lowStockItems: products
        });
    } catch (error) {
        next(error);
    }
};

// GET category-wise inventory summary using aggregation
exports.getSummary = async (req, res, next) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalItems: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalStockValue: {
                        $sum: { $multiply: ["$price", "$quantity"] }
                    },
                    avgPrice: { $avg: "$price" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.status(200).json({
            categories: summary.length,
            summary
        });
    } catch (error) {
        next(error);
    }
};

// INCREASE or DECREASE stock
exports.updateStock = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const change = Number(req.body.change);

        if (!Number.isInteger(change) || change === 0) {
            return res.status(400).json({
                message: "Change must be a non-zero whole number"
            });
        }

        const filter = { _id: req.params.id };

        // Do not allow stock to become negative
        if (change < 0) {
            filter.quantity = { $gte: Math.abs(change) };
        }

        const product = await Product.findOneAndUpdate(
            filter,
            { $inc: { quantity: change } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(400).json({
                message: "Product not found or insufficient stock"
            });
        }

        res.status(200).json({
            message: "Stock updated",
            product
        });
    } catch (error) {
        next(error);
    }
};
