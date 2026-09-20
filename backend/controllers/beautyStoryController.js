import BeautyStory from "../models/BeautyStory.js";

export const getBeautyStories = async (req, res) => {
  try {
    const stories = await BeautyStory.find({ active: true })
      .populate("productId", "name slug price images")
      .sort({
        sortOrder: 1,
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beauty stories",
      error: error.message,
    });
  }
};

export const getAllBeautyStories = async (req, res) => {
  try {
    const stories = await BeautyStory.find()
      .populate("productId", "name slug price images")
      .sort({
        sortOrder: 1,
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch all beauty stories",
      error: error.message,
    });
  }
};

export const createBeautyStory = async (req, res) => {
  try {
    const story = await BeautyStory.create(req.body);

    res.status(201).json({
      success: true,
      message: "Beauty story created successfully",
      story,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create beauty story",
      error: error.message,
    });
  }
};

export const updateBeautyStory = async (req, res) => {
  try {
    const story = await BeautyStory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Beauty story not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Beauty story updated successfully",
      story,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update beauty story",
      error: error.message,
    });
  }
};

export const deleteBeautyStory = async (req, res) => {
  try {
    const story = await BeautyStory.findByIdAndDelete(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Beauty story not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Beauty story deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete beauty story",
      error: error.message,
    });
  }
};

export const toggleBeautyStory = async (req, res) => {
  try {
    const story = await BeautyStory.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Beauty story not found",
      });
    }

    story.active = !story.active;
    await story.save();

    res.status(200).json({
      success: true,
      message: "Beauty story status updated",
      story,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update beauty story status",
      error: error.message,
    });
  }
};