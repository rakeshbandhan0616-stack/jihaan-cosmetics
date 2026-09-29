import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: 500,
    },

    link: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  isActive: 1,
  createdAt: -1,
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;