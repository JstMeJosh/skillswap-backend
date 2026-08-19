const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getPublicProfile,
  updateMe,
} = require("../controllers/userControllers");

// "/me" is declared before "/:id" so it can't be swallowed as an id param.
router.put("/me", protect, updateMe);
router.get("/:id", getPublicProfile);

module.exports = router;
