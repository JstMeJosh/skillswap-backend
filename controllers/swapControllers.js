const Swap = require("../models/Swap");

// GET /api/swaps  (public)
// Paginated marketplace list. Never exposes contact info (whatsapp) — that is
// revealed only through an accepted swap request (see requestControllers).
exports.getSwaps = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const [swaps, total] = await Promise.all([
      Swap.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-whatsapp")
        .populate("user", "name avatarUrl"),
      Swap.countDocuments(),
    ]);

    res.status(200).json({
      swaps,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/swaps/mine  (protected)
exports.getMySwaps = async (req, res) => {
  try {
    const swaps = await Swap.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(swaps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/swaps  (protected)
exports.createSwap = async (req, res) => {
  try {
    const { title, skillOffered, skillWanted, description } = req.body;
    const newSwap = await Swap.create({
      title,
      skillOffered,
      skillWanted,
      description,
      user: req.user._id,
      whatsapp: req.user.whatsapp,
    });
    res.status(201).json(newSwap);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/swaps/:id  (protected, owner only)
exports.updateSwap = async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);
    if (!swap) {
      return res.status(404).json({ message: "Swap not found" });
    }
    if (swap.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this swap" });
    }

    // Whitelist updatable fields so a client can't overwrite `user`/`whatsapp`.
    ["title", "skillOffered", "skillWanted", "description"].forEach((field) => {
      if (req.body[field] !== undefined) swap[field] = req.body[field];
    });

    const updatedSwap = await swap.save();
    res.status(200).json(updatedSwap);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/swaps/:id  (protected, owner only)
exports.deleteSwap = async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);
    if (!swap) {
      return res.status(404).json({ message: "Swap not found" });
    }
    if (swap.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this" });
    }

    await swap.deleteOne();
    res.status(200).json({ message: "Swap deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
