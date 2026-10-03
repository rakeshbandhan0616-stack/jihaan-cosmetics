import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| 3D VECTOR SCHEMA
|--------------------------------------------------------------------------
|
| Used for:
| - Position
| - Rotation
| - Scale
|
| Example:
| position: { x: 4, y: 1, z: -8 }
|
|--------------------------------------------------------------------------
*/

const vector3Schema = new mongoose.Schema(
  {
    x: {
      type: Number,
      default: 0,
    },

    y: {
      type: Number,
      default: 0,
    },

    z: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| MALL SPAWN POINT
|--------------------------------------------------------------------------
| Defines where the customer appears when entering the mall.
|--------------------------------------------------------------------------
*/

const spawnPointSchema = new mongoose.Schema(
  {
    position: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 1.6,
        z: 0,
      }),
    },

    rotation: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| STORE
|--------------------------------------------------------------------------
|
| Each store represents a physical section inside the virtual mall.
|
| Example:
| Makeup
| Skin Care
| Hair Care
| Fragrance
|
|--------------------------------------------------------------------------
*/

const storeSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: 120,
    },

    slug: {
      type: String,
      required: [true, "Store slug is required"],
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    subcategory: {
      type: String,
      default: "",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    bannerImage: {
      type: String,
      default: "",
      trim: true,
    },

    thumbnailImage: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | 3D STORE MODEL
    |--------------------------------------------------------------------------
    */

    modelUrl: {
      type: String,
      default: "",
      trim: true,
    },

    modelType: {
      type: String,
      enum: ["glb", "gltf", "fbx", "obj", "none"],
      default: "glb",
    },

    /*
    |--------------------------------------------------------------------------
    | STORE POSITION
    |--------------------------------------------------------------------------
    */

    position: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    rotation: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    scale: {
      type: vector3Schema,
      default: () => ({
        x: 1,
        y: 1,
        z: 1,
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | STORE SIZE
    |--------------------------------------------------------------------------
    */

    size: {
      width: {
        type: Number,
        default: 10,
        min: 0,
      },

      height: {
        type: Number,
        default: 4,
        min: 0,
      },

      depth: {
        type: Number,
        default: 10,
        min: 0,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | FLOOR
    |--------------------------------------------------------------------------
    */

    floorNumber: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | STORE APPEARANCE
    |--------------------------------------------------------------------------
    */

    primaryColor: {
      type: String,
      default: "#ffffff",
      trim: true,
    },

    secondaryColor: {
      type: String,
      default: "#f5f5f5",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | STORE BEHAVIOUR
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    allowProductInteraction: {
      type: Boolean,
      default: true,
    },

    showOnMap: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | DISPLAY ORDER
    |--------------------------------------------------------------------------
    */

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| PRODUCT LOCATION
|--------------------------------------------------------------------------
|
| Connects an existing MongoDB Product to a physical position
| inside the 3D mall.
|
| IMPORTANT:
| We store only the Product ObjectId.
|
| Product name, price, images, stock etc. continue to come from
| the existing Product model.
|
|--------------------------------------------------------------------------
*/

const productLocationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true,
    },

    floorNumber: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | 3D POSITION
    |--------------------------------------------------------------------------
    */

    position: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | 3D ROTATION
    |--------------------------------------------------------------------------
    */

    rotation: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | 3D SCALE
    |--------------------------------------------------------------------------
    */

    scale: {
      type: vector3Schema,
      default: () => ({
        x: 1,
        y: 1,
        z: 1,
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | PRODUCT DISPLAY
    |--------------------------------------------------------------------------
    */

    displayType: {
      type: String,
      enum: [
        "shelf",
        "table",
        "counter",
        "wall",
        "stand",
        "pedestal",
        "hanging",
        "floor",
        "special",
      ],
      default: "shelf",
    },

    modelUrl: {
      type: String,
      default: "",
      trim: true,
    },

    modelType: {
      type: String,
      enum: ["glb", "gltf", "fbx", "obj", "none"],
      default: "none",
    },

    /*
    |--------------------------------------------------------------------------
    | PRODUCT INTERACTION
    |--------------------------------------------------------------------------
    */

    isInteractive: {
      type: Boolean,
      default: true,
    },

    showProductPopup: {
      type: Boolean,
      default: true,
    },

    allowAddToCart: {
      type: Boolean,
      default: true,
    },

    allowViewDetails: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | DISPLAY SETTINGS
    |--------------------------------------------------------------------------
    */

    displayName: {
      type: String,
      default: "",
      trim: true,
    },

    displayPrice: {
      type: Boolean,
      default: true,
    },

    displayBadge: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | AVAILABILITY
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| FLOOR SCHEMA
|--------------------------------------------------------------------------
|
| Allows the mall to support multiple floors in the future.
|
|--------------------------------------------------------------------------
*/

const floorSchema = new mongoose.Schema(
  {
    floorNumber: {
      type: Number,
      required: true,
      min: 0,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | 3D FLOOR MODEL
    |--------------------------------------------------------------------------
    */

    modelUrl: {
      type: String,
      default: "",
      trim: true,
    },

    modelType: {
      type: String,
      enum: ["glb", "gltf", "fbx", "obj", "none"],
      default: "glb",
    },

    /*
    |--------------------------------------------------------------------------
    | FLOOR POSITION
    |--------------------------------------------------------------------------
    */

    position: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    rotation: {
      type: vector3Schema,
      default: () => ({
        x: 0,
        y: 0,
        z: 0,
      }),
    },

    scale: {
      type: vector3Schema,
      default: () => ({
        x: 1,
        y: 1,
        z: 1,
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | FLOOR SETTINGS
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true,
    },

    showOnMap: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| MALL SETTINGS
|--------------------------------------------------------------------------
*/

const mallSettingsSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | PLAYER
    |--------------------------------------------------------------------------
    */

    playerHeight: {
      type: Number,
      default: 1.7,
      min: 0.5,
      max: 3,
    },

    movementSpeed: {
      type: Number,
      default: 4,
      min: 0.1,
      max: 20,
    },

    runningSpeed: {
      type: Number,
      default: 7,
      min: 0.1,
      max: 30,
    },

    mouseSensitivity: {
      type: Number,
      default: 0.002,
      min: 0.0001,
      max: 1,
    },

    /*
    |--------------------------------------------------------------------------
    | CAMERA
    |--------------------------------------------------------------------------
    */

    cameraFov: {
      type: Number,
      default: 75,
      min: 30,
      max: 120,
    },

    cameraNear: {
      type: Number,
      default: 0.1,
      min: 0.001,
    },

    cameraFar: {
      type: Number,
      default: 1000,
      min: 10,
    },

    /*
    |--------------------------------------------------------------------------
    | MOBILE
    |--------------------------------------------------------------------------
    */

    mobileJoystickEnabled: {
      type: Boolean,
      default: true,
    },

    mobileSwipeEnabled: {
      type: Boolean,
      default: true,
    },

    forceLandscapeOnMobile: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | MAP
    |--------------------------------------------------------------------------
    */

    mapEnabled: {
      type: Boolean,
      default: true,
    },

    minimapEnabled: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | PRODUCT INTERACTION
    |--------------------------------------------------------------------------
    */

    productInteractionEnabled: {
      type: Boolean,
      default: true,
    },

    productInteractionDistance: {
      type: Number,
      default: 3,
      min: 0.5,
      max: 20,
    },

    /*
    |--------------------------------------------------------------------------
    | SOUND
    |--------------------------------------------------------------------------
    */

    backgroundMusicEnabled: {
      type: Boolean,
      default: false,
    },

    backgroundMusicUrl: {
      type: String,
      default: "",
      trim: true,
    },

    ambientSoundEnabled: {
      type: Boolean,
      default: false,
    },

    ambientSoundUrl: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | GRAPHICS
    |--------------------------------------------------------------------------
    */

    shadowsEnabled: {
      type: Boolean,
      default: true,
    },

    antialiasingEnabled: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | PERFORMANCE
    |--------------------------------------------------------------------------
    */

    maxPixelRatio: {
      type: Number,
      default: 2,
      min: 1,
      max: 4,
    },

    enableLazyLoading: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| VIRTUAL MALL SCHEMA
|--------------------------------------------------------------------------
*/

const virtualMallSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | BASIC INFORMATION
    |--------------------------------------------------------------------------
    */

    name: {
      type: String,
      required: [true, "Mall name is required"],
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: [true, "Mall slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    /*
    |--------------------------------------------------------------------------
    | BRANDING
    |--------------------------------------------------------------------------
    */

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    thumbnailImage: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | MAIN 3D MALL MODEL
    |--------------------------------------------------------------------------
    */

    modelUrl: {
      type: String,
      default: "",
      trim: true,
    },

    modelType: {
      type: String,
      enum: ["glb", "gltf", "fbx", "obj", "none"],
      default: "glb",
    },

    /*
    |--------------------------------------------------------------------------
    | ENVIRONMENT
    |--------------------------------------------------------------------------
    */

    environmentMapUrl: {
      type: String,
      default: "",
      trim: true,
    },

    skyboxUrl: {
      type: String,
      default: "",
      trim: true,
    },

    backgroundColor: {
      type: String,
      default: "#f8f5f2",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | FLOORS
    |--------------------------------------------------------------------------
    */

    floors: {
      type: [floorSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | STORES
    |--------------------------------------------------------------------------
    */

    stores: {
      type: [storeSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | PRODUCT LOCATIONS
    |--------------------------------------------------------------------------
    */

    productLocations: {
      type: [productLocationSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | PLAYER SPAWN
    |--------------------------------------------------------------------------
    */

    spawnPoint: {
      type: spawnPointSchema,
      default: () => ({
        position: {
          x: 0,
          y: 1.6,
          z: 0,
        },

        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
      }),
    },

    /*
    |--------------------------------------------------------------------------
    | MALL SETTINGS
    |--------------------------------------------------------------------------
    */

    settings: {
      type: mallSettingsSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | ACCESS / STATUS
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | MAINTENANCE
    |--------------------------------------------------------------------------
    */

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    maintenanceMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    /*
    |--------------------------------------------------------------------------
    | VERSION
    |--------------------------------------------------------------------------
    |
    | Useful when the 3D mall frontend needs to know that
    | the mall configuration has changed.
    |--------------------------------------------------------------------------
    */

    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

/*
 * Public mall lookup
 */
virtualMallSchema.index({
  slug: 1,
  isActive: 1,
  isPublished: 1,
});

/*
 * Store lookup
 */
virtualMallSchema.index({
  "stores.storeId": 1,
});

/*
 * Store category lookup
 */
virtualMallSchema.index({
  "stores.category": 1,
});

/*
 * Floor lookup
 */
virtualMallSchema.index({
  "stores.floorNumber": 1,
});

/*
 * Product location lookup
 */
virtualMallSchema.index({
  "productLocations.product": 1,
});

/*
 * Product location by store
 */
virtualMallSchema.index({
  "productLocations.storeId": 1,
});

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

/*
 * Prevent duplicate store IDs inside the same mall.
 */
virtualMallSchema.pre("validate", function () {
  const stores = Array.isArray(this.stores) ? this.stores : [];

  const storeIds = stores
    .map((store) => String(store.storeId || "").trim().toLowerCase())
    .filter(Boolean);

  const uniqueStoreIds = new Set(storeIds);

  if (storeIds.length !== uniqueStoreIds.size) {
    throw new Error("Duplicate storeId values are not allowed");
  }
});

/*
 * Prevent duplicate product locations for the same product
 * inside the same store.
 *
 * The same product can still exist in different stores if needed.
 */
virtualMallSchema.pre("validate", function () {
  const productLocations = Array.isArray(this.productLocations)
    ? this.productLocations
    : [];

  const locationKeys = productLocations
    .map((location) => {
      const productId = location.product
        ? String(location.product)
        : "";

      const storeId = String(location.storeId || "")
        .trim()
        .toLowerCase();

      return productId && storeId
        ? `${productId}:${storeId}`
        : "";
    })
    .filter(Boolean);

  const uniqueLocationKeys = new Set(locationKeys);

  if (locationKeys.length !== uniqueLocationKeys.size) {
    throw new Error(
      "Duplicate product location for the same product and store is not allowed",
    );
  }
});

/*
|--------------------------------------------------------------------------
| AUTOMATIC VERSION UPDATE
|--------------------------------------------------------------------------
|
| Whenever the mall document is saved after being modified,
| increase the configuration version.
|--------------------------------------------------------------------------
*/

virtualMallSchema.pre("save", function () {
  if (!this.isNew && this.isModified()) {
    this.version = Number(this.version || 1) + 1;
  }
});

/*
|--------------------------------------------------------------------------
| HELPER METHODS
|--------------------------------------------------------------------------
*/

/*
 * Get a store by storeId.
 */
virtualMallSchema.methods.getStore = function (storeId) {
  if (!storeId) {
    return null;
  }

  const normalizedStoreId = String(storeId)
    .trim()
    .toLowerCase();

  return (
    this.stores.find(
      (store) =>
        String(store.storeId).toLowerCase() ===
        normalizedStoreId,
    ) || null
  );
};

/*
 * Get all active stores.
 */
virtualMallSchema.methods.getActiveStores = function () {
  return this.stores.filter(
    (store) => store.isActive === true,
  );
};

/*
 * Get all active product locations.
 */
virtualMallSchema.methods.getActiveProductLocations =
  function () {
    return this.productLocations.filter(
      (location) => location.isActive === true,
    );
  };

/*
 * Get products belonging to a store.
 */
virtualMallSchema.methods.getStoreProductLocations =
  function (storeId) {
    if (!storeId) {
      return [];
    }

    const normalizedStoreId = String(storeId)
      .trim()
      .toLowerCase();

    return this.productLocations.filter(
      (location) =>
        String(location.storeId).toLowerCase() ===
          normalizedStoreId &&
        location.isActive === true,
    );
  };

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const VirtualMall =
  mongoose.models.VirtualMall ||
  mongoose.model("VirtualMall", virtualMallSchema);

export default VirtualMall;