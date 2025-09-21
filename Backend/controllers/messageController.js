import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Contact from "../models/contacts.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import User from "../models/user.model.js";
import { Language } from "../models/userLanguage.js"; // Import the language model
import translate from "translate";

translate.engine = "google"; // ✅ Use Google engine

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Fetch or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // Fetch sender and receiver from User model (basic info)
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: "Sender or receiver not found" });
    }

    // ✅ Fetch languages from Language collection
    const senderLangDoc = await Language.findOne({ userId: senderId });
    const receiverLangDoc = await Language.findOne({ userId: receiverId });

    const fromLang = senderLangDoc?.language || "en"; // sender's selected language
    const targetLang = receiverLangDoc?.language || "en"; // receiver's selected language

    // Translate message
    let translatedText;
    try {
      translatedText = await translate(message, {
        from: fromLang,
        to: targetLang,
      });
    } catch (err) {
      console.error("Translation failed, sending original message:", err);
      translatedText = message; // fallback
    }

    // Create message document
    const newMessage = new Message({
      senderId,
      receiverId,
      message,
      translatedMessage: translatedText,
    });

    conversation.messages.push(newMessage._id);
    await Promise.all([conversation.save(), newMessage.save()]);

    // Update contacts
    let senderContacts = await Contact.findOne({ user: senderId });
    if (!senderContacts.contacts.includes(receiverId)) {
      senderContacts.contacts.push(receiverId);
      await senderContacts.save();
    }

    let receiverContacts = await Contact.findOne({ user: receiverId });
    if (!receiverContacts.contacts.includes(senderId)) {
      receiverContacts.contacts.push(senderId);
      await receiverContacts.save();
    }

    // Emit to receiver if online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject(),
        translatedMessage: translatedText,
      });
    }

    console.log(
      `Message from ${sender.username} (${fromLang}) → ${receiver.username} (${targetLang}): "${message}" | Translated → "${translatedText}"`
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages");

    if (!conversation) return res.status(200).json([]);

    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
