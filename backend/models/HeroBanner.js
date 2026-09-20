import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    desktopSrc: {
      type: String,
      required: true,
      trim: true,
    },

    mobileSrc: {
      type: String,
      trim: true,
      default: "",
    },

    alt: {
      type: String,
      trim: true,
      default: "",
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productSlug: {
      type: String,
      trim: true,
      default: "",
    },

    buttonText: {
      type: String,
      trim: true,
      default: "Shop Now",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

heroBannerSchema.index({
  isActive: 1,
  displayOrder: 1,
});

const HeroBanner = mongoose.model("HeroBanner", heroBannerSchema);

export default HeroBanner;