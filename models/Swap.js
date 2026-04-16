const mongoose = require("mongoose");

const SwapSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    skillOffered: {
      type: String,
      required: true,
    },
    skillWanted: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Swap", SwapSchema);
