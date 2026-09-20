import express from "express";

import {
  getNewArrivals,
  getAdminNewArrivals,
  getNewArrivalById,
  createNewArrival,
  updateNewArrival,
  deleteNewArrival,
  toggleNewArrival,
} from "../controllers/newArrivalController.js";

import newArrivalUpload from "../middleware/newArrivalUpload.js";

const router = express.Router();

router.get("/", getNewArrivals);

router.get("/admin", getAdminNewArrivals);

router.get("/:id", getNewArrivalById);

router.post(
  "/",
  newArrivalUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "demoImage",
      maxCount: 1,
    },
  ]),
  createNewArrival
);

router.put(
  "/:id",
  newArrivalUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "demoImage",
      maxCount: 1,
    },
  ]),
  updateNewArrival
);

router.delete("/:id", deleteNewArrival);

router.patch("/:id/toggle", toggleNewArrival);

export default router;