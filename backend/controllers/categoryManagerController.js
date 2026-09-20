import mongoose from "mongoose";
import Product from "../models/Product.js";

const getCategoryConfig = (category) => {
  if (category === "new-arrivals") {
    return {
      flag: "isNewArrival",
      sortOrder: "newArrivalSortOrder",
      label: "New Arrival",
    };
  }

  if (category === "best-sellers") {
    return {
      flag: "isBestseller",
      sortOrder: "bestSellerSortOrder",
      label: "Best Seller",
    };
  }

  return null;
};

// --------------------------------------------------
// Get all products for New Arrival or Best Seller manager
// --------------------------------------------------

export const getCategoryProducts = async (req, res) => {
  try {
    const config = getCategoryConfig(req.params.category);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Use new-arrivals or best-sellers.",
      });
    }

    const products = await Product.find()
      .sort({
        [config.flag]: -1,
        [config.sortOrder]: 1,
        createdAt: -1,
      })
      .lean();

    res.status(200).json({
      success: true,
      category: req.params.category,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get category products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch category products.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Mark or unmark product
// --------------------------------------------------

export const toggleCategoryProduct = async (req, res) => {
  try {
    const { category, id } = req.params;

    const config = getCategoryConfig(category);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Use new-arrivals or best-sellers.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    product[config.flag] = !product[config.flag];

    /*
     * Keep productType updated for compatibility.
     * Boolean flags remain the main source of truth.
     */
    if (product.isNewArrival) {
      product.productType = "new-arrival";
    } else if (product.isBestseller) {
      product.productType = "bestseller";
    } else {
      product.productType = "regular";
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: `${config.label} status updated successfully.`,
      product,
    });
  } catch (error) {
    console.error("Toggle category product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update category status.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Update New Arrival or Best Seller sort order
// --------------------------------------------------

export const updateCategorySortOrder = async (req, res) => {
  try {
    const { category, id } = req.params;
    const { sortOrder } = req.body;

    const config = getCategoryConfig(category);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Use new-arrivals or best-sellers.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const parsedSortOrder = Number(sortOrder);

    if (!Number.isFinite(parsedSortOrder) || parsedSortOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "Sort order must be a valid non-negative number.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      {
        [config.sortOrder]: parsedSortOrder,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Sort order updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Update category sort order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update sort order.",
      error: error.message,
    });
  }
};