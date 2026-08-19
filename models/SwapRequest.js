const mongoose = require("mongoose");

const swapRequestSchema = new mongoose.Schema(
  {
    swap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Swap",
      required: true,
    },
    // The user asking to swap.
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The swap's owner. Denormalized so "incoming requests" is a single indexed
    // query instead of a join back through Swap.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// A requester can only have one request per swap (prevents spam / duplicates).
swapRequestSchema.index({ swap: 1, requester: 1 }, { unique: true });

module.exports = mongoose.model("SwapRequest", swapRequestSchema);
