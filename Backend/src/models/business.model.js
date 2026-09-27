import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    website: {
      type: String,
      trim: true,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    logoUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Business = mongoose.model("Business", businessSchema);

export default Business;