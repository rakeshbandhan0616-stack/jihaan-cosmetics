import Category from "../models/Category.js";

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
};

// --------------------------------------------------
// Get active categories
// --------------------------------------------------

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Get all categories
// --------------------------------------------------

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Create category
// --------------------------------------------------

export const createCategory = async (req, res, next) => {
  try {
    console.log("Category body:", req.body);
    console.log("Category file:", req.file);

    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const isActive = parseBoolean(req.body.isActive, true);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category image is required.",
      });
    }

    const image = `/uploads/categories/${req.file.filename}`;

    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    const category = await Category.create({
      name,
      description,
      image,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Update category
// --------------------------------------------------

export const updateCategory = async (req, res, next) => {
  try {
    console.log("Update category body:", req.body);
    console.log("Update category file:", req.file);

    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : category.name;

    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : category.description;

    const isActive = parseBoolean(req.body.isActive, category.isActive);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    category.name = name;
    category.description = description;
    category.isActive = isActive;

    // New image is optional while updating
    if (req.file) {
      category.image = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Delete category
// --------------------------------------------------

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};