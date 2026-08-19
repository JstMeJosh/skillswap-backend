const SwapRequest = require("../models/SwapRequest");
const Swap = require("../models/Swap");
const { z } = require("zod");

const createSchema = z.object({
  message: z.string().max(500).optional(),
});

const statusSchema = z.object({
  status: z.enum(["accepted", "declined", "cancelled"]),
});

// Contact info (whatsapp) is only revealed once a request is accepted — this is
// the privacy contract: browsing is anonymous, contact is earned by a match.
const revealContact = (party, status) => {
  if (!party) return party;
  if (status !== "accepted") {
    const { whatsapp, ...rest } = party;
    return rest;
  }
  return party;
};

// POST /api/swaps/:id/requests  (protected)
exports.createRequest = async (req, res) => {
  try {
    const validation = createSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }

    const swap = await Swap.findById(req.params.id);
    if (!swap) {
      return res.status(404).json({ message: "Swap not found" });
    }
    if (swap.user.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You can't request your own swap" });
    }

    // Re-open a previously declined/cancelled request rather than erroring on
    // the unique (swap, requester) index.
    let request = await SwapRequest.findOne({
      swap: swap._id,
      requester: req.user._id,
    });

    if (request) {
      if (request.status === "pending" || request.status === "accepted") {
        return res.status(409).json({
          message: "You already have an active request for this swap",
        });
      }
      request.status = "pending";
      request.message = validation.data.message;
      await request.save();
    } else {
      request = await SwapRequest.create({
        swap: swap._id,
        requester: req.user._id,
        owner: swap.user,
        message: validation.data.message,
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/requests/incoming  (protected) — requests on swaps I own
exports.getIncoming = async (req, res) => {
  try {
    const requests = await SwapRequest.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate("swap", "title skillOffered skillWanted")
      .populate("requester", "name avatarUrl whatsapp")
      .lean();

    const shaped = requests.map((r) => ({
      ...r,
      requester: revealContact(r.requester, r.status),
    }));

    res.status(200).json(shaped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/requests/outgoing  (protected) — requests I've sent
exports.getOutgoing = async (req, res) => {
  try {
    const requests = await SwapRequest.find({ requester: req.user._id })
      .sort({ createdAt: -1 })
      .populate("swap", "title skillOffered skillWanted")
      .populate("owner", "name avatarUrl whatsapp")
      .lean();

    const shaped = requests.map((r) => ({
      ...r,
      owner: revealContact(r.owner, r.status),
    }));

    res.status(200).json(shaped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/requests/:id  (protected) — owner accepts/declines, requester cancels
exports.updateRequest = async (req, res) => {
  try {
    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }
    const { status } = validation.data;

    const request = await SwapRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isOwner = request.owner.toString() === req.user._id.toString();
    const isRequester =
      request.requester.toString() === req.user._id.toString();

    // Role-based transitions: the owner may accept/decline, the requester may
    // cancel — and only while the request is still pending.
    if (status === "cancelled") {
      if (!isRequester) {
        return res
          .status(403)
          .json({ message: "Only the requester can cancel this" });
      }
    } else if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Only the swap owner can respond to this" });
    }

    if (request.status !== "pending") {
      return res
        .status(409)
        .json({ message: `Request is already ${request.status}` });
    }

    request.status = status;
    await request.save();

    // Return the fully-shaped request so the client can reveal contact info the
    // instant a request is accepted.
    const populated = await SwapRequest.findById(request._id)
      .populate("swap", "title skillOffered skillWanted")
      .populate("requester", "name avatarUrl whatsapp")
      .populate("owner", "name avatarUrl whatsapp")
      .lean();

    populated.requester = revealContact(populated.requester, populated.status);
    populated.owner = revealContact(populated.owner, populated.status);

    res.status(200).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
