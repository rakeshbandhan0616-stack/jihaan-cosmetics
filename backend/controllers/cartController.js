import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// --------------------------------------------------
// Get authenticated user ID
// --------------------------------------------------

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.auth?.userId ||
    req.user?.userId ||
    null
  );
};

// --------------------------------------------------
// Get product price
// --------------------------------------------------

const getProductPrice = (product) => {
  if (!product) {
    return 0;
  }

  return Number(
    product.salePrice ??
      product.discountPrice ??
      product.sellingPrice ??
      product.price ??
      0,
  );
};

// --------------------------------------------------
// Get product image
// --------------------------------------------------

const getProductImage = (product) => {
  if (!product) {
    return "";
  }

  return (
    product.image ||
    product.thumbnail ||
    product.images?.[0] ||
    ""
  );
};

// --------------------------------------------------
// Populate cart products
// --------------------------------------------------

const populateCart = async (cartId) => {
  return Cart.findById(cartId).populate({
    path: "items.product",
    select:
      "name title slug brand category image images thumbnail price oldPrice salePrice discountPrice sellingPrice stock quantity isActive active",
  });
};

// --------------------------------------------------
// Format cart response
// --------------------------------------------------

const formatCart = (cart) => {
  if (!cart) {
    return {
      _id: null,
      id: null,
      user: null,
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  let totalItems = 0;
  let subtotal = 0;

  const items = cart.items
    .map((item) => {
      const product = item.product;

      // Handle deleted or invalid products safely
      if (!product) {
        return null;
      }

      const productId = String(product._id);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const size = String(item.size || "Standard");
      const price = getProductPrice(product);
      const itemSubtotal = price * quantity;

      totalItems += quantity;
      subtotal += itemSubtotal;

      return {
        // Cart item ID
        id: `${productId}-${size}`,

        // Product ID
        productId,

        // Keep product as an object for the frontend
        product: {
          _id: productId,
          name: product.name || product.title || "Product",
          title: product.title || product.name || "Product",
          slug: product.slug || "",
          brand: product.brand || "",
          category: product.category || "",
          image: product.image || "",
          thumbnail: product.thumbnail || "",
          images: Array.isArray(product.images)
            ? product.images
            : [],
          price: Number(product.price || 0),
          oldPrice: Number(product.oldPrice || 0),
          salePrice:
            product.salePrice !== undefined
              ? Number(product.salePrice)
              : undefined,
          discountPrice:
            product.discountPrice !== undefined
              ? Number(product.discountPrice)
              : undefined,
          sellingPrice:
            product.sellingPrice !== undefined
              ? Number(product.sellingPrice)
              : undefined,
          stock: product.stock ?? product.quantity ?? null,
          isActive:
            product.isActive !== undefined
              ? product.isActive
              : product.active !== false,
        },

        // Flattened fields for easy frontend use
        name: product.name || product.title || "Product",
        slug: product.slug || "",
        brand: product.brand || "",
        category: product.category || "",
        image: getProductImage(product),
        price,
        quantity,
        size,
        subtotal: itemSubtotal,
        stock: product.stock ?? product.quantity ?? null,
        isActive:
          product.isActive !== undefined
            ? product.isActive
            : product.active !== false,
      };
    })
    .filter(Boolean);

  return {
    _id: cart._id,
    id: cart._id,
    user: cart.user,
    items,
    totalItems,
    subtotal,
  };
};

// --------------------------------------------------
// Get current user's cart
// GET /api/cart
// --------------------------------------------------

export const getCart = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }

    const populatedCart = await populateCart(cart._id);

    return res.status(200).json({
      success: true,
      cart: formatCart(populatedCart),
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Add product to cart
// POST /api/cart/items
// --------------------------------------------------

export const addToCart = async (req, res) => {
  try {
    const userId = getUserId(req);

    const {
      productId,
      quantity = 1,
      size = "Standard",
    } = req.body || {};

    console.log("ADD TO CART BODY:", req.body);
    console.log("AUTHENTICATED USER ID:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(String(productId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const normalizedProductId = String(productId);
    const normalizedSize = String(size || "Standard").trim();

    const product = await Product.findById(normalizedProductId);

    console.log(
      "PRODUCT FOUND:",
      product
        ? {
            id: product._id,
            name: product.name,
            isActive: product.isActive,
          }
        : null,
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found. Make sure the frontend sends the Product ID, not the Offer ID.",
      });
    }

    const productIsActive =
      product.isActive !== undefined
        ? product.isActive
        : product.active !== false;

    if (!productIsActive) {
      return res.status(400).json({
        success: false,
        message: "This product is currently unavailable",
      });
    }

    const availableStock = product.stock ?? product.quantity;

    if (
      availableStock !== undefined &&
      availableStock !== null &&
      parsedQuantity > Number(availableStock)
    ) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity is not available in stock",
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    const existingItem = cart.items.find((item) => {
      return (
        String(item.product) === normalizedProductId &&
        String(item.size || "Standard") === normalizedSize
      );
    });

    if (existingItem) {
      const newQuantity =
        Number(existingItem.quantity || 0) + parsedQuantity;

      if (
        availableStock !== undefined &&
        availableStock !== null &&
        newQuantity > Number(availableStock)
      ) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity exceeds available stock",
        });
      }

      existingItem.quantity = newQuantity;
      existingItem.size = normalizedSize;
    } else {
      cart.items.push({
        product: new mongoose.Types.ObjectId(normalizedProductId),
        quantity: parsedQuantity,
        size: normalizedSize,
      });
    }

    await cart.save();

    const populatedCart = await populateCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart: formatCart(populatedCart),
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Update cart item quantity
// PUT /api/cart/items/:productId
// --------------------------------------------------

export const updateCartItem = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    const {
      quantity,
      size = "Standard",
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(String(productId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const normalizedProductId = String(productId);
    const normalizedSize = String(size || "Standard").trim();

    const product = await Product.findById(normalizedProductId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productIsActive =
      product.isActive !== undefined
        ? product.isActive
        : product.active !== false;

    if (!productIsActive) {
      return res.status(400).json({
        success: false,
        message: "This product is currently unavailable",
      });
    }

    const availableStock = product.stock ?? product.quantity;

    if (
      availableStock !== undefined &&
      availableStock !== null &&
      parsedQuantity > Number(availableStock)
    ) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds available stock",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find((cartItem) => {
      return (
        String(cartItem.product) === normalizedProductId &&
        String(cartItem.size || "Standard") === normalizedSize
      );
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    item.quantity = parsedQuantity;
    item.size = normalizedSize;

    await cart.save();

    const populatedCart = await populateCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Cart item updated",
      cart: formatCart(populatedCart),
    });
  } catch (error) {
    console.error("UPDATE CART ITEM ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Remove item from cart
// DELETE /api/cart/items/:productId
// --------------------------------------------------

export const removeFromCart = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    const size = String(req.query.size || "Standard").trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(String(productId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const normalizedProductId = String(productId);

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter((item) => {
      return !(
        String(item.product) === normalizedProductId &&
        String(item.size || "Standard") === size
      );
    });

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    await cart.save();

    const populatedCart = await populateCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: formatCart(populatedCart),
    });
  } catch (error) {
    console.error("REMOVE CART ITEM ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove cart item",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Clear cart
// DELETE /api/cart
// --------------------------------------------------

export const clearCart = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          items: [],
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    const populatedCart = await populateCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: formatCart(populatedCart),
    });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message, 
    });
  }
};