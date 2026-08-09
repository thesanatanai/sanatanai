import mongoose, { Schema } from "mongoose";

const verifyOtpSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otpHash: {
        type: String,
        required: true
    },
    startTime: {
        type: Number,
        required: true,
        default: Date.now
    }
}, {
    expires: 600000
});

const newModel = () => mongoose.model("otp_verification", verifyOtpSchema);
const otpModel: ReturnType<typeof newModel> = mongoose.models.otp_verification || newModel();

export default otpModel;