import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";

const parseBoolean = (
  value,
  defaultValue = true
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return (
    String(value).toLowerCase() ===
    "true"
  );
};

/*
|--------------------------------------------------------------------------
| Upload image to Cloudinary
|--------------------------------------------------------------------------
*/

const uploadImageToCloudinary = (
  file,
  folder = "jihaan-cosmetics/categories"
) => {
  return new Promise(
    (resolve, reject) => {
      if (!file?.buffer) {
        resolve("");
        return;
      }

      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
          },
          (
            error,
            result
          ) => {
            if (error) {
              reject(error);
              return;
            }

            if (
              !result?.secure_url
            ) {
              reject(
                new Error(
                  "Cloudinary did not return an image URL."
                )
              );
              return;
            }

            resolve({
              url: result.secure_url,
              publicId:
                result.public_id,
              resourceType:
                result.resource_type ||
                "image",
            });
          }
        );

      uploadStream.end(
        file.buffer
      );
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Cloudinary information from URL
|--------------------------------------------------------------------------
*/

const getCloudinaryResourceInfoFromUrl = (
  imageUrl
) => {
  if (
    !imageUrl ||
    typeof imageUrl !== "string" ||
    !imageUrl.includes(
      "res.cloudinary.com"
    )
  ) {
    return null;
  }

  try {
    const parsedUrl =
      new URL(imageUrl);

    const uploadIndex =
      parsedUrl.pathname.indexOf(
        "/upload/"
      );

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdPath =
      parsedUrl.pathname.slice(
        uploadIndex +
          "/upload/".length
      );

    const pathParts =
      publicIdPath.split("/");

    /*
     * Remove transformation segments.
     */
    while (
      pathParts.length > 0 &&
      (
        pathParts[0].startsWith(
          "w_"
        ) ||
        pathParts[0].startsWith(
          "h_"
        ) ||
        pathParts[0].startsWith(
          "c_"
        ) ||
        pathParts[0].startsWith(
          "q_"
        ) ||
        pathParts[0].startsWith(
          "f_"
        ) ||
        pathParts[0].startsWith(
          "dpr_"
        ) ||
        pathParts[0].startsWith(
          "ar_"
        ) ||
        pathParts[0].startsWith(
          "g_"
        ) ||
        pathParts[0].startsWith(
          "e_"
        ) ||
        pathParts[0].startsWith(
          "fl_"
        )
      )
    ) {
      pathParts.shift();
    }

    publicIdPath =
      pathParts.join("/");

    /*
     * Remove version.
     */
    if (
      /^v\d+$/.test(
        publicIdPath.split(
          "/"
        )[0]
      )
    ) {
      publicIdPath =
        publicIdPath
          .split("/")
          .slice(1)
          .join("/");
    }

    /*
     * Remove file extension.
     */
    publicIdPath =
      publicIdPath.replace(
        /\.[^/.]+$/,
        ""
      );

    if (!publicIdPath) {
      return null;
    }

    return {
      publicId:
        publicIdPath,

      resourceType:
        parsedUrl.pathname.startsWith(
          "/video/"
        )
          ? "video"
          : "image",
    };
  } catch (error) {
    console.error(
      "CATEGORY CLOUDINARY URL PARSE ERROR:",
      error
    );

    return null;
  }
};

/*
|--------------------------------------------------------------------------
| Delete Cloudinary image
|--------------------------------------------------------------------------
*/

const deleteCloudinaryAsset = async (
  imageUrl
) => {
  const resourceInfo =
    getCloudinaryResourceInfoFromUrl(
      imageUrl
    );

  /*
   * This also safely ignores old local URLs:
   *
   * /uploads/categories/...
   */
  if (!resourceInfo) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      resourceInfo.publicId,
      {
        resource_type:
          resourceInfo.resourceType,

        invalidate: true,
      }
    );
  } catch (error) {
    console.error(
      "CATEGORY CLOUDINARY DELETE ERROR:",
      resourceInfo.publicId,
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get active categories
|--------------------------------------------------------------------------
*/

export const getCategories = async (
  req,
  res,
  next
) => {
  try {
    const categories =
      await Category.find({
        isActive: true,
      }).sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get all categories
|--------------------------------------------------------------------------
*/

export const getAllCategories =
  async (
    req,
    res,
    next
  ) => {
    try {
      const categories =
        await Category.find().sort({
          createdAt: -1,
        });

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| Create category
|--------------------------------------------------------------------------
*/

export const createCategory =
  async (
    req,
    res,
    next
  ) => {
    let uploadedImage = null;

    try {
      console.log(
        "Category body:",
        req.body
      );

      console.log(
        "Category file:",
        req.file
          ? {
              fieldname:
                req.file.fieldname,
              originalname:
                req.file.originalname,
              mimetype:
                req.file.mimetype,
              size:
                req.file.size,
            }
          : null
      );

      const name = String(
        req.body.name || ""
      ).trim();

      const description =
        String(
          req.body.description ||
            ""
        ).trim();

      const isActive =
        parseBoolean(
          req.body.isActive,
          true
        );

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Category name is required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Category image is required.",
        });
      }

      /*
       * Check duplicate category
       * before uploading to Cloudinary.
       */
      const existingCategory =
        await Category.findOne({
          name: {
            $regex: `^${name}$`,
            $options: "i",
          },
        });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message:
            "A category with this name already exists.",
        });
      }

      /*
       * Upload category image
       * to Cloudinary.
       */
      uploadedImage =
        await uploadImageToCloudinary(
          req.file
        );

      const category =
        await Category.create({
          name,

          description,

          image:
            uploadedImage.url,

          isActive,
        });

      res.status(201).json({
        success: true,
        message:
          "Category created successfully.",
        data: category,
      });
    } catch (error) {
      console.error(
        "CREATE CATEGORY ERROR:",
        error
      );

      /*
       * If MongoDB creation fails after
       * Cloudinary upload, remove the image.
       */
      if (uploadedImage?.url) {
        await deleteCloudinaryAsset(
          uploadedImage.url
        );
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| Update category
|--------------------------------------------------------------------------
*/

export const updateCategory =
  async (
    req,
    res,
    next
  ) => {
    let uploadedImage = null;

    try {
      console.log(
        "Update category body:",
        req.body
      );

      console.log(
        "Update category file:",
        req.file
          ? {
              fieldname:
                req.file.fieldname,
              originalname:
                req.file.originalname,
              mimetype:
                req.file.mimetype,
              size:
                req.file.size,
            }
          : null
      );

      const { id } =
        req.params;

      const category =
        await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message:
            "Category not found.",
        });
      }

      const name =
        req.body.name !==
        undefined
          ? String(
              req.body.name
            ).trim()
          : category.name;

      const description =
        req.body.description !==
        undefined
          ? String(
              req.body.description
            ).trim()
          : category.description;

      const isActive =
        parseBoolean(
          req.body.isActive,
          category.isActive
        );

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Category name is required.",
        });
      }

      /*
       * Check duplicate category name
       * when name is changed.
       */
      const duplicateCategory =
        await Category.findOne({
          name: {
            $regex: `^${name}$`,
            $options: "i",
          },

          _id: {
            $ne: id,
          },
        });

      if (duplicateCategory) {
        return res.status(409).json({
          success: false,
          message:
            "A category with this name already exists.",
        });
      }

      const oldImage =
        category.image;

      category.name = name;

      category.description =
        description;

      category.isActive =
        isActive;

      /*
       * New image is optional.
       */
      if (req.file) {
        /*
         * Upload new image first.
         */
        uploadedImage =
          await uploadImageToCloudinary(
            req.file
          );

        category.image =
          uploadedImage.url;
      }

      await category.save();

      /*
       * Delete old Cloudinary image
       * only after MongoDB update succeeds.
       */
      if (
        req.file &&
        oldImage
      ) {
        await deleteCloudinaryAsset(
          oldImage
        );
      }

      res.status(200).json({
        success: true,
        message:
          "Category updated successfully.",
        data: category,
      });
    } catch (error) {
      console.error(
        "UPDATE CATEGORY ERROR:",
        error
      );

      /*
       * If category update failed after
       * uploading a new image, remove
       * the new image.
       */
      if (uploadedImage?.url) {
        await deleteCloudinaryAsset(
          uploadedImage.url
        );
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| Delete category
|--------------------------------------------------------------------------
*/

export const deleteCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      /*
       * Find first so we have
       * the image URL.
       */
      const category =
        await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message:
            "Category not found.",
        });
      }

      /*
       * Delete MongoDB document.
       */
      await Category.findByIdAndDelete(
        id
      );

      /*
       * Delete Cloudinary image.
       *
       * Old local URLs are safely ignored.
       */
      await deleteCloudinaryAsset(
        category.image
      );

      res.status(200).json({
        success: true,
        message:
          "Category deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE CATEGORY ERROR:",
        error
      );

      next(error);
    }
  };