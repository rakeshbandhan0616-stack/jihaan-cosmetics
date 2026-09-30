import multer from "multer";

// ============================================================
// ALLOWED FILE TYPES
// ============================================================
const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

// ============================================================
// FILE FILTER
// ============================================================
const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, PNG, WEBP, AVIF, MP4, WEBM and MOV files are allowed."
      ),
      false
    );
  }

  cb(null, true);
};

// ============================================================
// MULTER CONFIGURATION
// ============================================================
// memoryStorage() keeps the uploaded file in RAM temporarily.
// The controller then sends file.buffer to Cloudinary.
// Nothing is permanently stored on the Render server.
// ============================================================
const heroBannerUpload = multer({
  storage: multer.memoryStorage(),

  fileFilter,

  limits: {
    files: 2,
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});

export default heroBannerUpload;