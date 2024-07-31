const express = require("express");
const {
  createMessage,
  getAllMessages,
} = require("./../Controllers/messageController");
const { protected } = require("./../Controllers/userController");
const router = express.Router();

router.post("/sendMsg/:userId", protected, createMessage);
router.get("/msg/:user2Id", protected, getAllMessages);

module.exports = router;
