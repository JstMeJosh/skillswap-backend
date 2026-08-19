const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getSwaps,
  getMySwaps,
  createSwap,
  updateSwap,
  deleteSwap,
} = require("../controllers/swapControllers");
const { createRequest } = require("../controllers/requestControllers");

router.get("/", getSwaps);
router.get("/mine", protect, getMySwaps);
router.post("/", protect, createSwap);
router.put("/:id", protect, updateSwap);
router.delete("/:id", protect, deleteSwap);

// A swap request is created against a specific swap.
router.post("/:id/requests", protect, createRequest);

module.exports = router;
