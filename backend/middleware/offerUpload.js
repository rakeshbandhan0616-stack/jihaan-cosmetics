import multer from "multer";

/*
|--------------------------------------------------------------------------
| Offer Upload Middleware
|--------------------------------------------------------------------------
| Files are kept in memory temporarily.
| The offerController uploads them to Cloudinary.
|--------------------------------------------------------------------------
*/

const fileFilter = (req, file, cb) => {
  const allowedFields = ["image", "demoImage"];

  if (!allowedFields.includes(file.fieldname)) {
    return cb(
      new Error(
        `Invalid upload field: ${file.fieldname}`
      ),
      false
    );
  }

  if (!file.mimetype?.startsWith("image/")) {
    return cb(
      new Error(
        "Only image files are allowed for offers."
      ),
      false
    );
  }

  cb(null, true);
};

const offerUpload = multer({
  storage: multer.memoryStorage(),

  fileFilter,

  limits: {
    files: 2,
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  {
    name: "image",
    maxCount: 1,
  },
  {
    name: "demoImage",
    maxCount: 1,
  },
]);

export default offerUpload;