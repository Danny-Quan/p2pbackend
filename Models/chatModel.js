const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    Chatusers: {
      type: Array,
      require: true,
    },
    message: {
      type: String,
      require: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

const Messages = mongoose.model("Message", messageSchema);
module.exports = Messages;
