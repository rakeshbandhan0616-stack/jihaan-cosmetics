import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) =>
          Array.isArray(images) && images.length <= 5,
        message: "Maximum 5 review images are allowed",
      },
    },

    verifiedPurchase: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subcategory: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    howToUse: {
      type: String,
      default: "",
      trim: true,
    },

    ingredients: {
      type: String,
      default: "",
      trim: true,
    },

    additionalDetails: {
      type: String,
      default: "",
      trim: true,
    },

    benefits: {
      type: String,
      default: "",
      trim: true,
    },

    composition: {
      type: String,
      default: "",
      trim: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountType: {
      type: String,
      enum: ["none", "flat", "percentage"],
      default: "none",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    reviewList: {
      type: [reviewSchema],
      default: [],
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],

    hoverImage: {
      type: String,
      default: "",
      trim: true,
    },

    beforeImage: {
      type: String,
      default: "",
      trim: true,
    },

    afterImage: {
      type: String,
      default: "",
      trim: true,
    },

    video: {
      type: String,
      default: "",
      trim: true,
    },

    youtubeVideoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    shades: [
      {
        type: String,
        trim: true,
      },
    ],

    badge: {
      type: String,
      default: "",
      trim: true,
    },

    productType: {
      type: String,
      enum: ["new-arrival", "bestseller", "regular"],
      default: "regular",
    },

    isNewArrival: {
      type: Boolean,
      default: false,
    },

    newArrivalSortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isBestseller: {
      type: Boolean,
      default: false,
    },

    bestSellerSortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Automatically calculate review count and average rating.
 *
 * This middleware intentionally uses async function syntax
 * without next(), preventing the "next is not a function" error.
 */
productSchema.pre("save", async function () {
  if (!this.isModified("reviewList")) {
    return;
  }

  const reviewList = Array.isArray(this.reviewList)
    ? this.reviewList
    : [];

  this.reviews = reviewList.length;

  if (reviewList.length === 0) {
    this.rating = 0;
    return;
  }

  const totalRating = reviewList.reduce(
    (total, review) => total + Number(review.rating || 0),
    0,
  );

  this.rating = Number(
    (totalRating / reviewList.length).toFixed(1),
  );
});

productSchema.index({ active: 1 });

productSchema.index({
  category: 1,
  active: 1,
});

productSchema.index({
  stock: 1,
});

productSchema.index({
  isNewArrival: 1,
  newArrivalSortOrder: 1,
});

productSchema.index({
  isBestseller: 1,
  bestSellerSortOrder: 1,
});

const Product = mongoose.model("Product", productSchema);

export default Product;