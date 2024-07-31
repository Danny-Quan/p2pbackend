const Messages = require("./../Models/chatModel");

exports.createMessage = async (req, res, next) => {
  try {
    const {message } = req.body;
    // console.log(req.body)
    const newMessage = await Messages.create({
      Chatusers: [res.user.id, req.params.userId],
      message,
      sender: res.user.id,
    });
    return res.status(200).json({
      newMessage,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

exports.getAllMessages = async (req, res, next) => {
  try {
    // const from = req.params.user1Id;
    const from = res.user.id;
    const to = req.params.user2Id;

    const newMessage = await Messages.find({
      Chatusers: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });
    const allMessages = newMessage.map((msg) => {
      return {
        myself: msg.sender.toString() === from,
        message: msg.message,
        createdAt: msg.createdAt
      };
    });

    return res.status(200).json(allMessages);
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};
