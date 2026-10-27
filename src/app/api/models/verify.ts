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
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Deletes 10 minutes after createdAt
    }
});


const blackListedSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    endTime: {
        type: Number,
        required: true,
        default: () => Date.now() + 300000 // 5 minutes
    },
    tries: Number
})
verifyOtpSchema.index({
    otp: 1
})
const newModel = () => mongoose.model("otp_verification", verifyOtpSchema);
const newMdl = () => mongoose.model("blacklisted", blackListedSchema);
const otpModel: ReturnType<typeof newModel> = mongoose.models.otp_verification || newModel();
export const blackListedModel: ReturnType<typeof newMdl> = mongoose.models.blacklisted || newMdl();

export default otpModel;