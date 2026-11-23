const express = require("express");
const router = express.Router();

const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getLowStock,
    getSummary,
    updateStock
} = require("../controller/productController");

// Keep these fixed routes before /:id
router.get("/low-stock", getLowStock);
router.get("/summary", getSummary);

router.post("/", createProduct);
router.get("/", getProducts);

router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateStock);

module.exports = router;
