import mongoose from "mongoose";
import VirtualMall from "../models/VirtualMall.js";
import Product from "../models/Product.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeString = (value, fallback = "") =>
  String(value ?? fallback).trim();

const normalizeSlug = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return Boolean(value);
};

/*
|--------------------------------------------------------------------------
| VECTOR HELPERS
|--------------------------------------------------------------------------
*/

const normalizeVector3 = (value, defaults = {}) => {
  const source =
    value && typeof value === "object"
      ? value
      : {};

  return {
    x: toNumber(source.x, defaults.x ?? 0),
    y: toNumber(source.y, defaults.y ?? 0),
    z: toNumber(source.z, defaults.z ?? 0),
  };
};

/*
|--------------------------------------------------------------------------
| ERROR RESPONSE
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  defaultMessage = "Internal server error",
) => {
  console.error("Virtual Mall Controller Error:", error);

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map(
        (item) => item.message,
      ),
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value already exists",
      error: error.keyValue || {},
    });
  }

  return res.status(500).json({
    success: false,
    message:
      error?.message ||
      defaultMessage,
  });
};

/*
|--------------------------------------------------------------------------
| POPULATE PRODUCT LOCATIONS
|--------------------------------------------------------------------------
*/

const populateMall = (query) =>
  query.populate({
    path: "productLocations.product",
    select:
      "name slug brand category subcategory description price oldPrice discountType discountValue rating reviews images hoverImage badge stock active",
  });

/*
|--------------------------------------------------------------------------
| GET ACTIVE / PUBLISHED MALL
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall
|--------------------------------------------------------------------------
*/

export const getVirtualMall = async (req, res) => {
  try {
    const mall = await populateMall(
      VirtualMall.findOne({
        isActive: true,
        isPublished: true,
      }),
    );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall is currently unavailable",
      });
    }

    if (mall.maintenanceMode) {
      return res.status(503).json({
        success: false,
        maintenanceMode: true,
        message:
          mall.maintenanceMessage ||
          "Virtual mall is currently under maintenance",
      });
    }

    return res.status(200).json({
      success: true,
      data: mall,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to load virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MALL BY SLUG
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/:slug
|--------------------------------------------------------------------------
*/

export const getVirtualMallBySlug = async (
  req,
  res,
) => {
  try {
    const slug = normalizeSlug(req.params.slug);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Mall slug is required",
      });
    }

    const mall = await populateMall(
      VirtualMall.findOne({
        slug,
        isActive: true,
        isPublished: true,
      }),
    );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    if (mall.maintenanceMode) {
      return res.status(503).json({
        success: false,
        maintenanceMode: true,
        message:
          mall.maintenanceMessage ||
          "Virtual mall is currently under maintenance",
      });
    }

    return res.status(200).json({
      success: true,
      data: mall,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to load virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL MALLS - ADMIN
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/admin/all
|--------------------------------------------------------------------------
*/

export const getAllVirtualMalls = async (
  req,
  res,
) => {
  try {
    const malls = await populateMall(
      VirtualMall.find({})
        .sort({
          createdAt: -1,
        }),
    );

    return res.status(200).json({
      success: true,
      count: malls.length,
      data: malls,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to fetch virtual malls",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MALL BY ID - ADMIN
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/admin/:mallId
|--------------------------------------------------------------------------
*/

export const getVirtualMallById = async (
  req,
  res,
) => {
  try {
    const { mallId } = req.params;

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall = await populateMall(
      VirtualMall.findById(mallId),
    );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: mall,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to fetch virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| CREATE MALL - ADMIN
|--------------------------------------------------------------------------
|
| POST /api/virtual-mall/admin
|--------------------------------------------------------------------------
*/

export const createVirtualMall = async (
  req,
  res,
) => {
  try {
    const body = req.body || {};

    const name = normalizeString(body.name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Mall name is required",
      });
    }

    const slug = normalizeSlug(
      body.slug || body.name,
    );

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Mall slug is required",
      });
    }

    const existingMall =
      await VirtualMall.findOne({ slug });

    if (existingMall) {
      return res.status(409).json({
        success: false,
        message:
          "A virtual mall with this slug already exists",
      });
    }

    const mall = new VirtualMall({
      name,

      slug,

      description: normalizeString(
        body.description,
      ),

      logo: normalizeString(body.logo),

      coverImage: normalizeString(
        body.coverImage,
      ),

      thumbnailImage: normalizeString(
        body.thumbnailImage,
      ),

      modelUrl: normalizeString(
        body.modelUrl,
      ),

      modelType:
        body.modelType || "glb",

      environmentMapUrl:
        normalizeString(
          body.environmentMapUrl,
        ),

      skyboxUrl:
        normalizeString(body.skyboxUrl),

      backgroundColor:
        normalizeString(
          body.backgroundColor,
          "#f8f5f2",
        ),

      floors: Array.isArray(body.floors)
        ? body.floors
        : [],

      stores: Array.isArray(body.stores)
        ? body.stores
        : [],

      productLocations:
        Array.isArray(
          body.productLocations,
        )
          ? body.productLocations
          : [],

      spawnPoint:
        body.spawnPoint || undefined,

      settings:
        body.settings || undefined,

      isActive: toBoolean(
        body.isActive,
        true,
      ),

      isPublished: toBoolean(
        body.isPublished,
        false,
      ),

      maintenanceMode: toBoolean(
        body.maintenanceMode,
        false,
      ),

      maintenanceMessage:
        normalizeString(
          body.maintenanceMessage,
        ),

      version: 1,
    });

    await mall.save();

    const populatedMall =
      await populateMall(
        VirtualMall.findById(
          mall._id,
        ),
      );

    return res.status(201).json({
      success: true,
      message:
        "Virtual mall created successfully",
      data: populatedMall,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to create virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE MALL - ADMIN
|--------------------------------------------------------------------------
|
| PUT /api/virtual-mall/admin/:mallId
|--------------------------------------------------------------------------
*/

export const updateVirtualMall = async (
  req,
  res,
) => {
  try {
    const { mallId } = req.params;

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall =
      await VirtualMall.findById(mallId);

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    const body = req.body || {};

    if (body.name !== undefined) {
      const name = normalizeString(
        body.name,
      );

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Mall name cannot be empty",
        });
      }

      mall.name = name;
    }

    if (body.slug !== undefined) {
      const slug = normalizeSlug(
        body.slug,
      );

      if (!slug) {
        return res.status(400).json({
          success: false,
          message:
            "Mall slug cannot be empty",
        });
      }

      const duplicate =
        await VirtualMall.findOne({
          slug,
          _id: {
            $ne: mall._id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another virtual mall already uses this slug",
        });
      }

      mall.slug = slug;
    }

    const stringFields = [
      "description",
      "logo",
      "coverImage",
      "thumbnailImage",
      "modelUrl",
      "environmentMapUrl",
      "skyboxUrl",
      "backgroundColor",
      "maintenanceMessage",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        mall[field] = normalizeString(
          body[field],
        );
      }
    }

    if (body.modelType !== undefined) {
      mall.modelType = body.modelType;
    }

    if (body.floors !== undefined) {
      if (!Array.isArray(body.floors)) {
        return res.status(400).json({
          success: false,
          message:
            "Floors must be an array",
        });
      }

      mall.floors = body.floors;
    }

    if (body.stores !== undefined) {
      if (!Array.isArray(body.stores)) {
        return res.status(400).json({
          success: false,
          message:
            "Stores must be an array",
        });
      }

      mall.stores = body.stores;
    }

    if (
      body.productLocations !== undefined
    ) {
      if (
        !Array.isArray(
          body.productLocations,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product locations must be an array",
        });
      }

      mall.productLocations =
        body.productLocations;
    }

    if (body.spawnPoint !== undefined) {
      mall.spawnPoint =
        body.spawnPoint;
    }

    if (body.settings !== undefined) {
      mall.settings =
        body.settings;
    }

    if (body.isActive !== undefined) {
      mall.isActive = toBoolean(
        body.isActive,
        mall.isActive,
      );
    }

    if (body.isPublished !== undefined) {
      mall.isPublished = toBoolean(
        body.isPublished,
        mall.isPublished,
      );
    }

    if (body.maintenanceMode !== undefined) {
      mall.maintenanceMode =
        toBoolean(
          body.maintenanceMode,
          mall.maintenanceMode,
        );
    }

    await mall.save();

    const populatedMall =
      await populateMall(
        VirtualMall.findById(
          mall._id,
        ),
      );

    return res.status(200).json({
      success: true,
      message:
        "Virtual mall updated successfully",
      data: populatedMall,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to update virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| DELETE MALL - ADMIN
|--------------------------------------------------------------------------
|
| DELETE /api/virtual-mall/admin/:mallId
|--------------------------------------------------------------------------
*/

export const deleteVirtualMall = async (
  req,
  res,
) => {
  try {
    const { mallId } = req.params;

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall =
      await VirtualMall.findByIdAndDelete(
        mallId,
      );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Virtual mall deleted successfully",
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to delete virtual mall",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET STORES
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/stores
|--------------------------------------------------------------------------
*/

export const getMallStores = async (
  req,
  res,
) => {
  try {
    const mall =
      await VirtualMall.findOne({
        isActive: true,
        isPublished: true,
      }).select(
        "name slug stores version maintenanceMode maintenanceMessage",
      );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message:
          "Virtual mall is unavailable",
      });
    }

    if (mall.maintenanceMode) {
      return res.status(503).json({
        success: false,
        maintenanceMode: true,
        message:
          mall.maintenanceMessage ||
          "Virtual mall is under maintenance",
      });
    }

    const stores =
      mall.stores
        .filter(
          (store) =>
            store.isActive === true,
        )
        .sort(
          (a, b) =>
            Number(a.sortOrder || 0) -
            Number(b.sortOrder || 0),
        );

    return res.status(200).json({
      success: true,
      data: stores,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to load mall stores",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE STORE
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/stores/:storeId
|--------------------------------------------------------------------------
*/

export const getMallStore = async (
  req,
  res,
) => {
  try {
    const storeId = normalizeString(
      req.params.storeId,
    ).toLowerCase();

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    const mall =
      await VirtualMall.findOne({
        isActive: true,
        isPublished: true,
      }).select(
        "name slug stores productLocations version maintenanceMode maintenanceMessage",
      );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message:
          "Virtual mall is unavailable",
      });
    }

    if (mall.maintenanceMode) {
      return res.status(503).json({
        success: false,
        maintenanceMode: true,
        message:
          mall.maintenanceMessage ||
          "Virtual mall is under maintenance",
      });
    }

    const store =
      mall.stores.find(
        (item) =>
          String(item.storeId)
            .toLowerCase() ===
          storeId,
      );

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const productLocations =
      mall.productLocations.filter(
        (location) =>
          String(location.storeId)
            .toLowerCase() ===
            storeId &&
          location.isActive === true,
      );

    return res.status(200).json({
      success: true,
      data: {
        store,
        productLocations,
      },
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to load store",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET STORE PRODUCTS
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/stores/:storeId/products
|--------------------------------------------------------------------------
*/

export const getStoreProducts = async (
  req,
  res,
) => {
  try {
    const storeId = normalizeString(
      req.params.storeId,
    ).toLowerCase();

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    const mall =
      await populateMall(
        VirtualMall.findOne({
          isActive: true,
          isPublished: true,
        }).select(
          "stores productLocations",
        ),
      );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message:
          "Virtual mall is unavailable",
      });
    }

    const store =
      mall.stores.find(
        (item) =>
          String(item.storeId)
            .toLowerCase() ===
          storeId &&
          item.isActive === true,
      );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const productLocations =
      mall.productLocations
        .filter(
          (location) =>
            String(location.storeId)
              .toLowerCase() ===
              storeId &&
            location.isActive === true,
        )
        .sort(
          (a, b) =>
            Number(a.sortOrder || 0) -
            Number(b.sortOrder || 0),
        );

    const products =
      productLocations
        .filter(
          (location) =>
            location.product &&
            location.product.active === true,
        )
        .map((location) => ({
          locationId: location._id,
          storeId: location.storeId,

          position: location.position,
          rotation: location.rotation,
          scale: location.scale,

          displayType:
            location.displayType,

          modelUrl:
            location.modelUrl,

          modelType:
            location.modelType,

          isInteractive:
            location.isInteractive,

          showProductPopup:
            location.showProductPopup,

          allowAddToCart:
            location.allowAddToCart,

          allowViewDetails:
            location.allowViewDetails,

          displayName:
            location.displayName,

          displayPrice:
            location.displayPrice,

          displayBadge:
            location.displayBadge,

          product:
            location.product,
        }));

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        storeId: store.storeId,
        name: store.name,
        slug: store.slug,
        category: store.category,
      },
      count: products.length,
      data: products,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to load store products",
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET PRODUCT LOCATION
|--------------------------------------------------------------------------
|
| GET /api/virtual-mall/products/:productId
|--------------------------------------------------------------------------
*/

export const getProductLocation = async (
  req,
  res,
) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const mall =
      await populateMall(
        VirtualMall.findOne({
          isActive: true,
          isPublished: true,
          "productLocations.product":
            productId,
        }).select(
          "name slug stores productLocations",
        ),
      );

    if (!mall) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not placed inside the virtual mall",
      });
    }

    const locations =
      mall.productLocations.filter(
        (location) =>
          location.product &&
          String(location.product._id) ===
            String(productId) &&
          location.isActive === true,
      );

    return res.status(200).json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to find product location",
    );
  }
};

/*
|--------------------------------------------------------------------------
| ADD STORE - ADMIN
|--------------------------------------------------------------------------
|
| POST /api/virtual-mall/admin/:mallId/stores
|--------------------------------------------------------------------------
*/

export const addStore = async (
  req,
  res,
) => {
  try {
    const { mallId } = req.params;
    const body = req.body || {};

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall =
      await VirtualMall.findById(mallId);

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    const storeId = normalizeString(
      body.storeId ||
        body.slug ||
        body.name,
    ).toLowerCase();

    const name = normalizeString(
      body.name,
    );

    if (!storeId || !name) {
      return res.status(400).json({
        success: false,
        message:
          "Store ID and store name are required",
      });
    }

    const duplicateStore =
      mall.stores.some(
        (store) =>
          String(store.storeId)
            .toLowerCase() ===
          storeId,
      );

    if (duplicateStore) {
      return res.status(409).json({
        success: false,
        message:
          "A store with this ID already exists",
      });
    }

    const store = {
      storeId,

      name,

      slug: normalizeSlug(
        body.slug || name,
      ),

      description:
        normalizeString(
          body.description,
        ),

      category:
        normalizeString(
          body.category,
        ),

      subcategory:
        normalizeString(
          body.subcategory,
        ),

      logo:
        normalizeString(body.logo),

      bannerImage:
        normalizeString(
          body.bannerImage,
        ),

      thumbnailImage:
        normalizeString(
          body.thumbnailImage,
        ),

      modelUrl:
        normalizeString(
          body.modelUrl,
        ),

      modelType:
        body.modelType || "glb",

      position:
        normalizeVector3(
          body.position,
        ),

      rotation:
        normalizeVector3(
          body.rotation,
        ),

      scale:
        normalizeVector3(
          body.scale,
          {
            x: 1,
            y: 1,
            z: 1,
          },
        ),

      size: {
        width: toNumber(
          body.size?.width,
          10,
        ),

        height: toNumber(
          body.size?.height,
          4,
        ),

        depth: toNumber(
          body.size?.depth,
          10,
        ),
      },

      floorNumber: toNumber(
        body.floorNumber,
        0,
      ),

      primaryColor:
        normalizeString(
          body.primaryColor,
          "#ffffff",
        ),

      secondaryColor:
        normalizeString(
          body.secondaryColor,
          "#f5f5f5",
        ),

      isActive: toBoolean(
        body.isActive,
        true,
      ),

      isFeatured: toBoolean(
        body.isFeatured,
        false,
      ),

      allowProductInteraction:
        toBoolean(
          body.allowProductInteraction,
          true,
        ),

      showOnMap: toBoolean(
        body.showOnMap,
        true,
      ),

      sortOrder: toNumber(
        body.sortOrder,
        0,
      ),
    };

    mall.stores.push(store);

    await mall.save();

    const createdStore =
      mall.stores[
        mall.stores.length - 1
      ];

    return res.status(201).json({
      success: true,
      message:
        "Store added successfully",
      data: createdStore,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to add store",
    );
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE STORE - ADMIN
|--------------------------------------------------------------------------
|
| PUT /api/virtual-mall/admin/:mallId/stores/:storeId
|--------------------------------------------------------------------------
*/

export const updateStore = async (
  req,
  res,
) => {
  try {
    const {
      mallId,
      storeId,
    } = req.params;

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall =
      await VirtualMall.findById(mallId);

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    const normalizedStoreId =
      normalizeString(
        storeId,
      ).toLowerCase();

    const store =
      mall.stores.find(
        (item) =>
          String(item.storeId)
            .toLowerCase() ===
          normalizedStoreId,
      );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const body = req.body || {};

    const stringFields = [
      "name",
      "description",
      "category",
      "subcategory",
      "logo",
      "bannerImage",
      "thumbnailImage",
      "modelUrl",
      "primaryColor",
      "secondaryColor",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        store[field] =
          normalizeString(
            body[field],
          );
      }
    }

    if (body.slug !== undefined) {
      store.slug = normalizeSlug(
        body.slug,
      );
    }

    if (body.modelType !== undefined) {
      store.modelType =
        body.modelType;
    }

    if (body.position !== undefined) {
      store.position =
        normalizeVector3(
          body.position,
        );
    }

    if (body.rotation !== undefined) {
      store.rotation =
        normalizeVector3(
          body.rotation,
        );
    }

    if (body.scale !== undefined) {
      store.scale =
        normalizeVector3(
          body.scale,
          {
            x: 1,
            y: 1,
            z: 1,
          },
        );
    }

    if (body.size !== undefined) {
      store.size = {
        width: toNumber(
          body.size?.width,
          store.size?.width || 10,
        ),

        height: toNumber(
          body.size?.height,
          store.size?.height || 4,
        ),

        depth: toNumber(
          body.size?.depth,
          store.size?.depth || 10,
        ),
      };
    }

    if (body.floorNumber !== undefined) {
      store.floorNumber =
        toNumber(
          body.floorNumber,
          store.floorNumber,
        );
    }

    const booleanFields = [
      "isActive",
      "isFeatured",
      "allowProductInteraction",
      "showOnMap",
    ];

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        store[field] =
          toBoolean(
            body[field],
            store[field],
          );
      }
    }

    if (body.sortOrder !== undefined) {
      store.sortOrder =
        toNumber(
          body.sortOrder,
          store.sortOrder,
        );
    }

    await mall.save();

    return res.status(200).json({
      success: true,
      message:
        "Store updated successfully",
      data: store,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to update store",
    );
  }
};

/*
|--------------------------------------------------------------------------
| DELETE STORE - ADMIN
|--------------------------------------------------------------------------
|
| DELETE /api/virtual-mall/admin/:mallId/stores/:storeId
|--------------------------------------------------------------------------
*/

export const deleteStore = async (
  req,
  res,
) => {
  try {
    const {
      mallId,
      storeId,
    } = req.params;

    if (!isValidObjectId(mallId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mall ID",
      });
    }

    const mall =
      await VirtualMall.findById(mallId);

    if (!mall) {
      return res.status(404).json({
        success: false,
        message: "Virtual mall not found",
      });
    }

    const normalizedStoreId =
      normalizeString(
        storeId,
      ).toLowerCase();

    const initialCount =
      mall.stores.length;

    mall.stores =
      mall.stores.filter(
        (store) =>
          String(store.storeId)
            .toLowerCase() !==
          normalizedStoreId,
      );

    if (
      mall.stores.length ===
      initialCount
    ) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    /*
     * Remove product locations belonging
     * to the deleted store as well.
     */
    mall.productLocations =
      mall.productLocations.filter(
        (location) =>
          String(location.storeId)
            .toLowerCase() !==
          normalizedStoreId,
      );

    await mall.save();

    return res.status(200).json({
      success: true,
      message:
        "Store and its product locations deleted successfully",
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to delete store",
    );
  }
};

/*
|--------------------------------------------------------------------------
| ADD PRODUCT LOCATION - ADMIN
|--------------------------------------------------------------------------
|
| POST /api/virtual-mall/admin/:mallId/product-location
|--------------------------------------------------------------------------
*/

export const addProductLocation =
  async (req, res) => {
    try {
      const { mallId } = req.params;
      const body = req.body || {};

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      if (
        !isValidObjectId(body.product)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid product ID is required",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      const storeId =
        normalizeString(
          body.storeId,
        ).toLowerCase();

      if (!storeId) {
        return res.status(400).json({
          success: false,
          message:
            "Store ID is required",
        });
      }

      const storeExists =
        mall.stores.some(
          (store) =>
            String(store.storeId)
              .toLowerCase() ===
              storeId,
        );

      if (!storeExists) {
        return res.status(404).json({
          success: false,
          message:
            "Store does not exist in this mall",
        });
      }

      const product =
        await Product.findById(
          body.product,
        ).select(
          "_id name slug brand category price images stock active",
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (!product.active) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot place an inactive product in the mall",
        });
      }

      const duplicate =
        mall.productLocations.some(
          (location) =>
            String(location.product) ===
              String(product._id) &&
            String(location.storeId)
              .toLowerCase() ===
              storeId,
        );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "This product is already placed in this store",
        });
      }

      const productLocation = {
        product: product._id,

        storeId,

        floorNumber: toNumber(
          body.floorNumber,
          0,
        ),

        position:
          normalizeVector3(
            body.position,
          ),

        rotation:
          normalizeVector3(
            body.rotation,
          ),

        scale:
          normalizeVector3(
            body.scale,
            {
              x: 1,
              y: 1,
              z: 1,
            },
          ),

        displayType:
          body.displayType ||
          "shelf",

        modelUrl:
          normalizeString(
            body.modelUrl,
          ),

        modelType:
          body.modelType ||
          "none",

        isInteractive:
          toBoolean(
            body.isInteractive,
            true,
          ),

        showProductPopup:
          toBoolean(
            body.showProductPopup,
            true,
          ),

        allowAddToCart:
          toBoolean(
            body.allowAddToCart,
            true,
          ),

        allowViewDetails:
          toBoolean(
            body.allowViewDetails,
            true,
          ),

        displayName:
          normalizeString(
            body.displayName,
          ),

        displayPrice:
          toBoolean(
            body.displayPrice,
            true,
          ),

        displayBadge:
          toBoolean(
            body.displayBadge,
            true,
          ),

        isActive:
          toBoolean(
            body.isActive,
            true,
          ),

        sortOrder:
          toNumber(
            body.sortOrder,
            0,
          ),
      };

      mall.productLocations.push(
        productLocation,
      );

      await mall.save();

      const createdLocation =
        mall.productLocations[
          mall.productLocations.length - 1
        ];

      await createdLocation.populate(
        "product",
      );

      return res.status(201).json({
        success: true,
        message:
          "Product added to virtual mall successfully",
        data: createdLocation,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to add product location",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT LOCATION - ADMIN
|--------------------------------------------------------------------------
|
| PUT /api/virtual-mall/admin/:mallId/product-location/:locationId
|--------------------------------------------------------------------------
*/

export const updateProductLocation =
  async (req, res) => {
    try {
      const {
        mallId,
        locationId,
      } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      if (!isValidObjectId(locationId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product location ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      const location =
        mall.productLocations.id(
          locationId,
        );

      if (!location) {
        return res.status(404).json({
          success: false,
          message:
            "Product location not found",
        });
      }

      const body = req.body || {};

      /*
       * Product can optionally be changed.
       */
      if (body.product !== undefined) {
        if (
          !isValidObjectId(
            body.product,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product ID",
          });
        }

        const product =
          await Product.findById(
            body.product,
          );

        if (!product) {
          return res.status(404).json({
            success: false,
            message:
              "Product not found",
          });
        }

        if (!product.active) {
          return res.status(400).json({
            success: false,
            message:
              "Product is inactive",
          });
        }

        location.product =
          product._id;
      }

      if (body.storeId !== undefined) {
        const storeId =
          normalizeString(
            body.storeId,
          ).toLowerCase();

        const storeExists =
          mall.stores.some(
            (store) =>
              String(store.storeId)
                .toLowerCase() ===
              storeId,
          );

        if (!storeExists) {
          return res.status(404).json({
            success: false,
            message:
              "Store does not exist",
          });
        }

        location.storeId =
          storeId;
      }

      if (
        body.floorNumber !==
        undefined
      ) {
        location.floorNumber =
          toNumber(
            body.floorNumber,
            location.floorNumber,
          );
      }

      if (body.position !== undefined) {
        location.position =
          normalizeVector3(
            body.position,
          );
      }

      if (body.rotation !== undefined) {
        location.rotation =
          normalizeVector3(
            body.rotation,
          );
      }

      if (body.scale !== undefined) {
        location.scale =
          normalizeVector3(
            body.scale,
            {
              x: 1,
              y: 1,
              z: 1,
            },
          );
      }

      const stringFields = [
        "modelUrl",
        "displayName",
      ];

      for (const field of stringFields) {
        if (body[field] !== undefined) {
          location[field] =
            normalizeString(
              body[field],
            );
        }
      }

      if (
        body.displayType !==
        undefined
      ) {
        location.displayType =
          body.displayType;
      }

      if (
        body.modelType !==
        undefined
      ) {
        location.modelType =
          body.modelType;
      }

      const booleanFields = [
        "isInteractive",
        "showProductPopup",
        "allowAddToCart",
        "allowViewDetails",
        "displayPrice",
        "displayBadge",
        "isActive",
      ];

      for (const field of booleanFields) {
        if (body[field] !== undefined) {
          location[field] =
            toBoolean(
              body[field],
              location[field],
            );
        }
      }

      if (
        body.sortOrder !==
        undefined
      ) {
        location.sortOrder =
          toNumber(
            body.sortOrder,
            location.sortOrder,
          );
      }

      await mall.save();

      await location.populate(
        "product",
      );

      return res.status(200).json({
        success: true,
        message:
          "Product location updated successfully",
        data: location,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to update product location",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT LOCATION - ADMIN
|--------------------------------------------------------------------------
|
| DELETE /api/virtual-mall/admin/:mallId/product-location/:locationId
|--------------------------------------------------------------------------
*/

export const deleteProductLocation =
  async (req, res) => {
    try {
      const {
        mallId,
        locationId,
      } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      if (!isValidObjectId(locationId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product location ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      const location =
        mall.productLocations.id(
          locationId,
        );

      if (!location) {
        return res.status(404).json({
          success: false,
          message:
            "Product location not found",
        });
      }

      location.deleteOne();

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Product removed from virtual mall successfully",
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to delete product location",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT POSITION ONLY - ADMIN
|--------------------------------------------------------------------------
|
| Useful for a future 3D admin editor.
|
| PATCH /api/virtual-mall/admin/:mallId/product-location/:locationId/position
|--------------------------------------------------------------------------
*/

export const updateProductPosition =
  async (req, res) => {
    try {
      const {
        mallId,
        locationId,
      } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      if (!isValidObjectId(locationId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product location ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      const location =
        mall.productLocations.id(
          locationId,
        );

      if (!location) {
        return res.status(404).json({
          success: false,
          message:
            "Product location not found",
        });
      }

      if (req.body.position) {
        location.position =
          normalizeVector3(
            req.body.position,
          );
      }

      if (req.body.rotation) {
        location.rotation =
          normalizeVector3(
            req.body.rotation,
          );
      }

      if (req.body.scale) {
        location.scale =
          normalizeVector3(
            req.body.scale,
            {
              x: 1,
              y: 1,
              z: 1,
            },
          );
      }

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Product 3D position updated successfully",
        data: {
          locationId:
            location._id,

          position:
            location.position,

          rotation:
            location.rotation,

          scale:
            location.scale,
        },
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to update product position",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PLAYER SPAWN POINT - ADMIN
|--------------------------------------------------------------------------
|
| PUT /api/virtual-mall/admin/:mallId/spawn-point
|--------------------------------------------------------------------------
*/

export const updateSpawnPoint =
  async (req, res) => {
    try {
      const { mallId } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      if (req.body.position) {
        mall.spawnPoint.position =
          normalizeVector3(
            req.body.position,
            {
              x: 0,
              y: 1.6,
              z: 0,
            },
          );
      }

      if (req.body.rotation) {
        mall.spawnPoint.rotation =
          normalizeVector3(
            req.body.rotation,
          );
      }

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Mall spawn point updated successfully",
        data: mall.spawnPoint,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to update spawn point",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE MALL SETTINGS - ADMIN
|--------------------------------------------------------------------------
|
| PUT /api/virtual-mall/admin/:mallId/settings
|--------------------------------------------------------------------------
*/

export const updateMallSettings =
  async (req, res) => {
    try {
      const { mallId } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      const allowedNumberFields = [
        "playerHeight",
        "movementSpeed",
        "runningSpeed",
        "mouseSensitivity",
        "cameraFov",
        "cameraNear",
        "cameraFar",
        "productInteractionDistance",
        "maxPixelRatio",
      ];

      const allowedBooleanFields = [
        "mobileJoystickEnabled",
        "mobileSwipeEnabled",
        "forceLandscapeOnMobile",
        "mapEnabled",
        "minimapEnabled",
        "productInteractionEnabled",
        "backgroundMusicEnabled",
        "ambientSoundEnabled",
        "shadowsEnabled",
        "antialiasingEnabled",
        "enableLazyLoading",
      ];

      const allowedStringFields = [
        "backgroundMusicUrl",
        "ambientSoundUrl",
      ];

      for (
        const field of allowedNumberFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          mall.settings[field] =
            toNumber(
              req.body[field],
              mall.settings[field],
            );
        }
      }

      for (
        const field of allowedBooleanFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          mall.settings[field] =
            toBoolean(
              req.body[field],
              mall.settings[field],
            );
        }
      }

      for (
        const field of allowedStringFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          mall.settings[field] =
            normalizeString(
              req.body[field],
            );
        }
      }

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Virtual mall settings updated successfully",
        data: mall.settings,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to update mall settings",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| PUBLISH MALL - ADMIN
|--------------------------------------------------------------------------
|
| PATCH /api/virtual-mall/admin/:mallId/publish
|--------------------------------------------------------------------------
*/

export const publishVirtualMall =
  async (req, res) => {
    try {
      const { mallId } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      mall.isPublished = true;
      mall.isActive = true;

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Virtual mall published successfully",
        data: {
          isPublished:
            mall.isPublished,
          isActive:
            mall.isActive,
          version:
            mall.version,
        },
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to publish virtual mall",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| UNPUBLISH MALL - ADMIN
|--------------------------------------------------------------------------
|
| PATCH /api/virtual-mall/admin/:mallId/unpublish
|--------------------------------------------------------------------------
*/

export const unpublishVirtualMall =
  async (req, res) => {
    try {
      const { mallId } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      mall.isPublished = false;

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          "Virtual mall unpublished successfully",
        data: {
          isPublished:
            mall.isPublished,
        },
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to unpublish virtual mall",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| MAINTENANCE MODE - ADMIN
|--------------------------------------------------------------------------
|
| PATCH /api/virtual-mall/admin/:mallId/maintenance
|--------------------------------------------------------------------------
*/

export const updateMaintenanceMode =
  async (req, res) => {
    try {
      const { mallId } = req.params;

      if (!isValidObjectId(mallId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mall ID",
        });
      }

      const mall =
        await VirtualMall.findById(
          mallId,
        );

      if (!mall) {
        return res.status(404).json({
          success: false,
          message:
            "Virtual mall not found",
        });
      }

      mall.maintenanceMode =
        toBoolean(
          req.body.maintenanceMode,
          false,
        );

      if (
        req.body.message !==
        undefined
      ) {
        mall.maintenanceMessage =
          normalizeString(
            req.body.message,
          );
      }

      await mall.save();

      return res.status(200).json({
        success: true,
        message:
          mall.maintenanceMode
            ? "Virtual mall maintenance mode enabled"
            : "Virtual mall maintenance mode disabled",

        data: {
          maintenanceMode:
            mall.maintenanceMode,

          maintenanceMessage:
            mall.maintenanceMessage,
        },
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to update maintenance mode",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| CHECK PRODUCT AVAILABILITY
|--------------------------------------------------------------------------
|
| Useful before Add To Cart from the 3D mall.
|
| GET /api/virtual-mall/products/:productId/availability
|--------------------------------------------------------------------------
*/

export const checkProductAvailability =
  async (req, res) => {
    try {
      const { productId } = req.params;

      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      const product =
        await Product.findById(
          productId,
        ).select(
          "_id name price oldPrice stock active images",
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          productId:
            product._id,

          name:
            product.name,

          price:
            product.price,

          oldPrice:
            product.oldPrice,

          stock:
            product.stock,

          active:
            product.active,

          available:
            product.active === true &&
            Number(product.stock || 0) > 0,
        },
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Unable to check product availability",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export default {
  getVirtualMall,
  getVirtualMallBySlug,

  getAllVirtualMalls,
  getVirtualMallById,

  createVirtualMall,
  updateVirtualMall,
  deleteVirtualMall,

  getMallStores,
  getMallStore,
  getStoreProducts,

  getProductLocation,

  addStore,
  updateStore,
  deleteStore,

  addProductLocation,
  updateProductLocation,
  deleteProductLocation,

  updateProductPosition,

  updateSpawnPoint,
  updateMallSettings,

  publishVirtualMall,
  unpublishVirtualMall,

  updateMaintenanceMode,

  checkProductAvailability,
};