const User = require("../models/User");
const Swap = require("../models/Swap");
const { z } = require("zod");

const updateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60).optional(),
  whatsapp: z.string().min(10, "Enter a valid WhatsApp number").max(20).optional(),
  bio: z.string().max(500, "Bio must be 500 characters or fewer").optional(),
  avatarUrl: z
    .union([z.string().url("Avatar must be a valid URL").max(500), z.literal("")])
    .optional(),
  location: z.string().max(100).optional(),
  skills: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

// GET /api/users/:id  (public)
// Public profile: only non-sensitive fields, plus that user's live swaps.
// Never returns email or whatsapp — contact stays gated behind swap requests.
exports.getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name avatarUrl bio skills location createdAt",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const swaps = await Swap.find({ user: user._id })
      .sort({ createdAt: -1 })
      .select("-whatsapp");
    res.status(200).json({ user, swaps });
  } catch (error) {
    // Malformed ObjectId lands here.
    res.status(400).json({ message: "Invalid user id" });
  }
};

// PUT /api/users/me  (protected)
exports.updateMe = async (req, res) => {
  try {
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    ["name", "whatsapp", "bio", "avatarUrl", "location", "skills"].forEach(
      (field) => {
        if (validation.data[field] !== undefined) {
          user[field] = validation.data[field];
        }
      },
    );

    await user.save();
    // Sanitized via User.toJSON; includes _id so the client can refresh context.
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
