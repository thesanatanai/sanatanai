import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  picture: {
    type: String,
    default: "user.png"
  },
  prefferedLocale: {
    type: String,
    enum: ["en", "hi"],
    default: "en",
  },
});

const newModel = () => mongoose.model("users", userSchema);
const userModel: ReturnType<typeof newModel> = mongoose.models.users || newModel();
export default userModel;