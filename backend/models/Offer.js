import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Offer name is required"],
      trim: true,
    },

    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      required: [true, "At least one product must be selected"],
      validate: {
        validator: function (products) {
          return Array.isArray(products) && products.length > 0;
        },
        message: "At least one product must be selected",
      },
    },

    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be greater than 5"],
    },

    reviews: {
      type: Number,
      default: 0,
      min: [0, "Reviews cannot be negative"],
    },

    oldPrice: {
      type: Number,
      required: [true, "Old price is required"],
      min: [0, "Old price cannot be negative"],
    },

    price: {
      type: Number,
      required: [true, "Offer price is required"],
      min: [0, "Offer price cannot be negative"],
    },

    discount: {
      type: String,
      required: [true, "Discount is required"],
      trim: true,
    },

    prepaidPrice: {
      type: Number,
      default: 0,
      min: [0, "Prepaid price cannot be negative"],
    },

    image: {
      type: String,
      required: [true, "Offer image is required"],
      trim: true,
    },

    demoImage: {
      type: String,
      default: "",
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Document validation
|--------------------------------------------------------------------------
| Do not use next() here.
| Throw an Error when validation fails.
*/
offerSchema.pre("validate", function () {
  if (!Array.isArray(this.products) || this.products.length === 0) {
    throw new Error("At least one product must be selected");
  }

  const oldPrice = Number(this.oldPrice);
  const price = Number(this.price);
  const prepaidPrice = Number(this.prepaidPrice || 0);

  if (price > oldPrice) {
    throw new Error("Offer price cannot be greater than the old price");
  }

  if (prepaidPrice > price && prepaidPrice !== 0) {
    throw new Error(
      "Prepaid price cannot be greater than the offer price"
    );
  }
});

/*
|--------------------------------------------------------------------------
| findOneAndUpdate validation
|--------------------------------------------------------------------------
*/
offerSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};

  const updateData = {
    ...(update.$set || {}),
  };

  const currentOffer = await this.model
    .findOne(this.getQuery())
    .lean();

  if (!currentOffer) {
    throw new Error("Offer not found");
  }

  const finalProducts =
    updateData.products !== undefined
      ? updateData.products
      : currentOffer.products;

  const finalOldPrice =
    updateData.oldPrice !== undefined
      ? Number(updateData.oldPrice)
      : Number(currentOffer.oldPrice);

  const finalPrice =
    updateData.price !== undefined
      ? Number(updateData.price)
      : Number(currentOffer.price);

  const finalPrepaidPrice =
    updateData.prepaidPrice !== undefined
      ? Number(updateData.prepaidPrice)
      : Number(currentOffer.prepaidPrice || 0);

  if (!Array.isArray(finalProducts) || finalProducts.length === 0) {
    throw new Error("At least one product must be selected");
  }

  if (finalPrice > finalOldPrice) {
    throw new Error("Offer price cannot be greater than the old price");
  }

  if (finalPrepaidPrice > finalPrice && finalPrepaidPrice !== 0) {
    throw new Error(
      "Prepaid price cannot be greater than the offer price"
    );
  }
});

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;