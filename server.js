const express = require("express");
require("dotenv").config();

const connectDB = require("./database/db");
const productRoutes = require("./routes/productRoutes");

const app = express();

// Read JSON data sent from Postman
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    res.send("Inventory Management System is running");
});

// Product API routes
app.use("/api/products", productRoutes);

// Route not found
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Common error handler
app.use((err, req, res, next) => {
    console.log(err.message);

    if (err.code === 11000) {
        return res.status(400).json({
            message: "SKU already exists"
        });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: err.message
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            message: "Invalid ID"
        });
    }

    res.status(500).json({
        message: "Server error"
    });
});

// Connect database first, then start server
connectDB().then(() => {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
