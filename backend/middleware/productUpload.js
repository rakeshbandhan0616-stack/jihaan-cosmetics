import multer from "multer";

// --------------------------------------------------
// Supported upload fields
// --------------------------------------------------

const imageFields = [
  "images",
  "hoverImage",
  "beforeImage",
  "afterImage",
];

const videoFields = ["video"];

// --------------------------------------------------
// File validation
// --------------------------------------------------

const fileFilter = (req, file, cb) => {
  // Product images
  if (imageFields.includes(file.fieldname)) {
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only image files are allowed for product images.",
      ),
    );

    return;
  }

  // Product video
  if (videoFields.includes(file.fieldname)) {
    if (file.mimetype?.startsWith("video/")) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only video files are allowed for product videos.",
      ),
    );

    return;
  }

  cb(new Error("Invalid upload field."));
};

// --------------------------------------------------
// Multer configuration
// --------------------------------------------------
//
// IMPORTANT:
// memoryStorage() keeps the uploaded file in memory.
// The controller will send it directly to Cloudinary.
//
// Do NOT use diskStorage() here.
// --------------------------------------------------

const productUpload = multer({
  storage: multer.memoryStorage(),

  fileFilter,

  limits: {
    /*
      10 gallery images
      1 hover image
      1 before image
      1 after image
      1 video

      Total = 14 files
    */
    files: 14,

    // Maximum size of each file: 100 MB
    fileSize: 100 * 1024 * 1024,
  },
});

export default productUpload;