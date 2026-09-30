import multer from "multer";

/*
|--------------------------------------------------------------------------
| Category Upload Middleware
|--------------------------------------------------------------------------
| Files are kept in memory temporarily.
| categoryController uploads the image to Cloudinary.
|--------------------------------------------------------------------------
*/

const fileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith("image/")) {
    return cb(
      new Error("Only image files are allowed."),
      false
    );
  }

  cb(null, true);
};

const categoryUpload = multer({
  storage: multer.memoryStorage(),

  fileFilter,

  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

export default categoryUpload;