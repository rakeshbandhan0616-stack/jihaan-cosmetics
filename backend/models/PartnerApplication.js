import mongoose from "mongoose";

const partnerApplicationSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    partnerType: {
      type: String,
      enum: ["seller", "logisticpartner"],
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
    },

    alternatePhone: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },

    documents: {
      gstNumber: String,
      panNumber: String,
      businessRegistrationNumber: String,
      fssaiNumber: String,
      drivingLicenseNumber: String,
      vehicleRcNumber: String,
    },

    logistics: {
      vehicleType: String,
      vehicleNumber: String,
      serviceArea: String,
      deliveryCapacity: String,
    },

    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reverted"],
      default: "pending",
      index: true,
    },

    adminRemark: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "PartnerApplication",
  partnerApplicationSchema
);