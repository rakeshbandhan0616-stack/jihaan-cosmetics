import multer from "multer";
import path from "node:path";
import fs from "node:fs";

// --------------------------------------------------
// Upload directories
// --------------------------------------------------

const productsUploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "products",
);

const imageUploadDirectory = path.join(
  productsUploadDirectory,
  "images",
);

const videoUploadDirectory = path.join(
  productsUploadDirectory,
  "videos",
);

// Create directories if they do not exist
fs.mkdirSync(imageUploadDirectory, {
  recursive: true,
});

fs.mkdirSync(videoUploadDirectory, {
  recursive: true,
});

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
// Storage configuration
// --------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (imageFields.includes(file.fieldname)) {
      cb(null, imageUploadDirectory);
      return;
    }

    if (videoFields.includes(file.fieldname)) {
      cb(null, videoUploadDirectory);
      return;
    }

    cb(new Error("Invalid upload field."));
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    let prefix = "product-file";

    if (file.fieldname === "images") {
      prefix = "product-image";
    }

    if (file.fieldname === "hoverImage") {
      prefix = "product-hover-image";
    }

    if (file.fieldname === "beforeImage") {
      prefix = "product-before-image";
    }

    if (file.fieldname === "afterImage") {
      prefix = "product-after-image";
    }

    if (file.fieldname === "video") {
      prefix = "product-video";
    }

    const filename = `${prefix}-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, filename);
  },
});

// --------------------------------------------------
// File validation
// --------------------------------------------------

const fileFilter = (req, file, cb) => {
  if (imageFields.includes(file.fieldname)) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files are allowed for product images.",
        ),
      );
    }

    return;
  }

  if (videoFields.includes(file.fieldname)) {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only video files are allowed for product videos.",
        ),
      );
    }

    return;
  }

  cb(new Error("Invalid upload field."));
};

// --------------------------------------------------
// Multer configuration
// --------------------------------------------------

const productUpload = multer({
  storage,
  fileFilter,

  limits: {
    /*
      Maximum total uploaded files:

      10 gallery images
      1 hover image
      1 before image
      1 after image
      1 video

      Total: 14 files
    */
    files: 14,

    // Maximum size for each file: 100 MB
    fileSize: 100 * 1024 * 1024,
  },
});

export default productUpload;