const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const sendEmail = require("../utils/sendMail");
const crypto = require("crypto");

const CLIENT_URL =
  process.env.CLIENT_URL || "https://skillswap-delta-eight.vercel.app";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("enter a valid Email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  whatsapp: z.string().min(10),
});
const loginSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});
const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email"),
});
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

exports.register = async (req, res) => {
  try {
    // 1. Validate with Zod
    const validation = registerSchema.safeParse(req.body);

    // 2. If validation fails, return the specific Zod error
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    // 3. Extract the clean data
    const { name, email, password, whatsapp } = validation.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 4. Create User using extracted data
    const user = await User.create({ name, email, password, whatsapp });

    // --- HTML Email Logic stays same ---
    const welcomeHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; color: #333;">

    <h2 style="color: #4F46E5; text-align: center;">
      Welcome to 
      <span style="color:#2563EB; font-weight:bold;">Skill</span>
      <span style="color:#1E293B; font-weight:bold;">Swap</span>, ${user.name}! 🚀
    </h2>

    <p>We're excited to have you in our community of learners and experts.</p>

    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">How to get started:</h3>
      <ul style="line-height: 1.6;">
        <li><strong>Post a Swap:</strong> Share a skill you have and one you want to learn.</li>
        <li><strong>Browse:</strong> Look through the marketplace for interesting matches.</li>
        <li><strong>Connect:</strong> Use the WhatsApp button to chat instantly with other users.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${CLIENT_URL}/login"
         style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
         Log In to Your Dashboard
      </a>
    </div>

    <p style="font-size: 12px; color: #777; text-align: center;">
      If you didn't sign up for 
      <span style="color:#2563EB; font-weight:bold;">Skill</span>
      <span style="color:#1E293B; font-weight:bold;">Swap</span>, you can safely ignore this email.
    </p>

  </div>
`;


    try {
      await sendEmail({
        email: user.email,
        subject: "Welcome to SkillSwap",
        html: welcomeHtml,
      });
    } catch (error) {
      console.log("Email failed but user created");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.log("Registration Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }

    const { email, password } = validation.data;

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // FIX: Call matchPassword on the 'user' instance, not the 'User' model
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Return the full (sanitized via schema toJSON) user so the client always
    // gets a consistent shape with `_id`.
    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Login Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }

    // Generic response regardless of whether the email exists, to avoid
    // leaking which addresses are registered (user enumeration).
    const genericResponse = {
      success: true,
      message: "If an account exists for that email, a reset link was sent.",
    };

    const user = await User.findOne({ email: validation.data.email });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${CLIENT_URL}/resetpassword/${resetToken}`;
    const message = `
  <h1>You requested a password reset</h1>
  <p>Please click the link below to reset your password. This link expires in 10 minutes.</p>

  <a href="${resetUrl}" clicktracking="off"
     style="
       display:inline-block;
       padding:12px 24px;
       background-color:#007BFF;
       color:#ffffff;
       text-decoration:none;
       border-radius:6px;
       font-weight:bold;
       font-family:Arial, sans-serif;
     ">
     Reset Password
  </a>

  <p style="margin-top:30px; text-align:center; font-size:14px; color:#555;">
    Powered by
    <span style="color:#2563EB; font-weight:bold;">Skill</span>
    <span style="color:#1E293B; font-weight:bold;">Swap</span>
  </p>
`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        html: message,
      });
      return res.status(200).json(genericResponse);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ message: validation.error.issues[0].message });
    }

    // Hash the token from the URL to match the one in DB
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Must not be expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password
    user.password = validation.data.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
