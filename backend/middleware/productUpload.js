import multer from "multer";

// --------------------------------------------------
// File validation
// --------------------------------------------------

const fileFilter = (req, file, cb) => {
  // Product images
  if (
    [
      "images",
      "hoverImage",
      "beforeImage",
      "afterImage",
    ].includes(file.fieldname)
  ) {
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only image files are allowed for product images."
      ),
      false
    );

    return;
  }

  // Product video
  if (file.fieldname === "video") {
    if (file.mimetype?.startsWith("video/")) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only video files are allowed for product videos."
      ),
      false
    );

    return;
  }

  cb(
    new Error("Invalid upload field."),
    false
  );
};

// --------------------------------------------------
// Multer configuration
// --------------------------------------------------
// memoryStorage() is required because the controller
// uploads file.buffer directly to Cloudinary.
// --------------------------------------------------

const productUpload = multer({
  storage: multer.memoryStorage(),

  fileFilter,

  limits: {
    files: 14,
    fileSize: 100 * 1024 * 1024,
  },
}).fields([
  {
    name: "images",
    maxCount: 10,
  },
  {
    name: "hoverImage",
    maxCount: 1,
  },
  {
    name: "beforeImage",
    maxCount: 1,
  },
  {
    name: "afterImage",
    maxCount: 1,
  },
  {
    name: "video",
    maxCount: 1,
  },
]);

export default productUpload;