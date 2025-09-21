import mongoose from "mongoose";

const userLanguageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    language: { type: String, required: true, default: "en" },
  },
  { timestamps: true }
);

export const Language = mongoose.model("Language", userLanguageSchema);
