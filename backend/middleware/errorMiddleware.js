import multer from "multer";

const errorMiddleware = (error, _req, res, _next) => {
  console.error("Backend error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Profile image must be smaller than 2 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.message?.includes("Only JPG")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(
      (item) => item.message
    );

    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${duplicateField} is already registered.`,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

export default errorMiddleware;