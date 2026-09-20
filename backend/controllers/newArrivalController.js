import fs from "fs";
import path from "path";

import NewArrival from "../models/NewArrival.js";

const getImageUrl = (req, file) => {
  if (!file) {
    return "";
  }

  return `${req.protocol}://${req.get("host")}/uploads/new-arrivals/${file.filename}`;
};

const deleteImage = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") {
    return;
  }

  if (!imageUrl.includes("/uploads/new-arrivals/")) {
    return;
  }

  const fileName = imageUrl.split("/uploads/new-arrivals/").pop();

  if (!fileName) {
    return;
  }

  const filePath = path.join(
    process.cwd(),
    "uploads",
    "new-arrivals",
    fileName
  );

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// GET /api/new-arrivals
const getNewArrivals = async (req, res) => {
  try {
    const newArrivals = await NewArrival.find({
      active: true,
    }).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      newArrivals,
    });
  } catch (error) {
    console.error("GET NEW ARRIVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch new arrivals.",
    });
  }
};

// GET /api/new-arrivals/admin
const getAdminNewArrivals = async (req, res) => {
  try {
    const newArrivals = await NewArrival.find().sort({
      sortOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      newArrivals,
    });
  } catch (error) {
    console.error("GET ADMIN NEW ARRIVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admin new arrivals.",
    });
  }
};

// GET /api/new-arrivals/:id
const getNewArrivalById = async (req, res) => {
  try {
    const newArrival = await NewArrival.findById(req.params.id);

    if (!newArrival) {
      return res.status(404).json({
        success: false,
        message: "New arrival not found.",
      });
    }

    return res.status(200).json({
      success: true,
      newArrival,
    });
  } catch (error) {
    console.error("GET NEW ARRIVAL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch new arrival.",
    });
  }
};

// POST /api/new-arrivals
const createNewArrival = async (req, res) => {
  try {
    const files = req.files || {};

    const imageFile = files.image?.[0];
    const demoImageFile = files.demoImage?.[0];

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Main image is required.",
      });
    }

    const newArrival = await NewArrival.create({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      description: req.body.description || "",
      rating: Number(req.body.rating || 0),
      reviews: Number(req.body.reviews || 0),
      oldPrice: Number(req.body.oldPrice),
      price: Number(req.body.price),
      discount: req.body.discount || "",
      prepaidPrice: Number(req.body.prepaidPrice || 0),
      image: getImageUrl(req, imageFile),
      demoImage: demoImageFile
        ? getImageUrl(req, demoImageFile)
        : "",
      active:
        req.body.active === undefined
          ? true
          : req.body.active === true ||
            req.body.active === "true",
      sortOrder: Number(req.body.sortOrder || 0),
    });

    return res.status(201).json({
      success: true,
      message: "New arrival created successfully.",
      newArrival,
    });
  } catch (error) {
    console.error("CREATE NEW ARRIVAL ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to create new arrival.",
    });
  }
};

// PUT /api/new-arrivals/:id
const updateNewArrival = async (req, res) => {
  try {
    const existingNewArrival = await NewArrival.findById(
      req.params.id
    );

    if (!existingNewArrival) {
      return res.status(404).json({
        success: false,
        message: "New arrival not found.",
      });
    }

    const files = req.files || {};

    const imageFile = files.image?.[0];
    const demoImageFile = files.demoImage?.[0];

    const updateData = {
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      description: req.body.description || "",
      rating: Number(req.body.rating || 0),
      reviews: Number(req.body.reviews || 0),
      oldPrice: Number(req.body.oldPrice),
      price: Number(req.body.price),
      discount: req.body.discount || "",
      prepaidPrice: Number(req.body.prepaidPrice || 0),
      active:
        req.body.active === true ||
        req.body.active === "true",
      sortOrder: Number(req.body.sortOrder || 0),
    };

    if (imageFile) {
      deleteImage(existingNewArrival.image);
      updateData.image = getImageUrl(req, imageFile);
    }

    if (demoImageFile) {
      deleteImage(existingNewArrival.demoImage);
      updateData.demoImage = getImageUrl(req, demoImageFile);
    }

    const updatedNewArrival = await NewArrival.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "New arrival updated successfully.",
      newArrival: updatedNewArrival,
    });
  } catch (error) {
    console.error("UPDATE NEW ARRIVAL ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to update new arrival.",
    });
  }
};

// DELETE /api/new-arrivals/:id
const deleteNewArrival = async (req, res) => {
  try {
    const newArrival = await NewArrival.findById(req.params.id);

    if (!newArrival) {
      return res.status(404).json({
        success: false,
        message: "New arrival not found.",
      });
    }

    deleteImage(newArrival.image);
    deleteImage(newArrival.demoImage);

    await NewArrival.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "New arrival deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE NEW ARRIVAL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete new arrival.",
    });
  }
};

// PATCH /api/new-arrivals/:id/toggle
const toggleNewArrival = async (req, res) => {
  try {
    const newArrival = await NewArrival.findById(req.params.id);

    if (!newArrival) {
      return res.status(404).json({
        success: false,
        message: "New arrival not found.",
      });
    }

    newArrival.active = !newArrival.active;

    await newArrival.save();

    return res.status(200).json({
      success: true,
      message: `New arrival ${
        newArrival.active ? "activated" : "deactivated"
      } successfully.`,
      newArrival,
    });
  } catch (error) {
    console.error("TOGGLE NEW ARRIVAL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update new arrival status.",
    });
  }
};

export {
  getNewArrivals,
  getAdminNewArrivals,
  getNewArrivalById,
  createNewArrival,
  updateNewArrival,
  deleteNewArrival,
  toggleNewArrival,
};