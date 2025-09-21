import { Language } from "../models/userLanguage.js"; // Import the language model
import User from "../models/user.model.js"; // Optional: to check if user exists

export const setLanguage = async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!userId || !language) {
      return res.status(400).json({ error: "UserId and language are required" });
    }

    // Optional: check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update or create user's language
    const langDoc = await Language.findOneAndUpdate(
      { userId }, // filter
      { language }, // update language
      { new: true, upsert: true } // create if not exists
    );

    res.status(200).json({ message: `Language updated to ${language}`, langDoc });
  } catch (error) {
    console.error("Error updating language:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
