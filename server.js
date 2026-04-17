const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const Swap = require("./models/Swap");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://skillswap-delta-eight.vercel.app",
      "https://skillswap-delta-eight.vercel.app/",
      process.env.FRONTEND_URL || ""
    ].filter(Boolean),
  }),
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected");
  })
  .catch((err) => {
    console.log("DB Connection failed", err);
  });

app.get("/api/swaps", async (req, res) => {
  try {
    const allSwaps = await Swap.find().sort({ createdAt: -1 });
    res.status(200).json(allSwaps);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
app.post("/api/swaps", async (req, res) => {
  try {
    const newSwap = await Swap.create(req.body);
    res.status(201).json(newSwap);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
app.put("/api/swaps/:id", async (req, res) => {
  try {
    const updatedSwap = await Swap.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(updatedSwap);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
app.delete("/api/swaps/:id", async (req, res) => {
  try {
    await Swap.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Swap deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
