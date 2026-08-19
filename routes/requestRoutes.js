const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getIncoming,
  getOutgoing,
  updateRequest,
} = require("../controllers/requestControllers");

router.get("/incoming", protect, getIncoming);
router.get("/outgoing", protect, getOutgoing);
router.patch("/:id", protect, updateRequest);

module.exports = router;
