import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    default: "New Chat"
  },
  timestamp: {
    type: Number,
    required: true,
    default: Date.now
  },
  chatId: {
    type: String,
    required: true
  },
  messages: [{
    index: Number,
    role: {
        type: String,
        enum: ["model", "user"],
        required: true
    },
    parts: [{
        text: String,
        inlineData: {
            data: String,
            mimeType: String
        },
        functionCall: {
          id: String,
          args: Map,
          name: String
        }
    }]
  }]
});
const newModel = () => mongoose.model("chats", chatSchema);
const chatModel: ReturnType<typeof newModel> = mongoose.models.chats || newModel();
export default chatModel;