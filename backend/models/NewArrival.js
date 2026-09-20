import mongoose from "mongoose";

const newArrivalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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

    description: {
      type: String,
      default: "",
      trim: true,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviews: {
      type: Number,
      min: 0,
      default: 0,
    },

    oldPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: String,
      default: "",
      trim: true,
    },

    prepaidPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: String,
      required: true,
    },

    demoImage: {
      type: String,
      default: "",
    },

    active: {
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
    timestamps: true,
  }
);

newArrivalSchema.pre("validate", function () {
  if (Number(this.price) > Number(this.oldPrice)) {
    throw new Error("New arrival price cannot exceed old price.");
  }

  if (
    Number(this.prepaidPrice || 0) > Number(this.price) &&
    Number(this.prepaidPrice || 0) !== 0
  ) {
    throw new Error("Prepaid price cannot exceed new arrival price.");
  }
});

const NewArrival = mongoose.model("NewArrival", newArrivalSchema);

export default NewArrival;