const User = require("./../Models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};
const createCookieAndToken = (res, user) => {
  const token = createToken(user._id);
  res.cookie("token", token, {
    expires: new Date(Date.now() + 60 * 60 * 24 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return token;
};

exports.registerUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error("please provide username or password");
    }
    const registeredUser = await User.findOne({ username });
    if (registeredUser) {
      throw new Error("username already exist");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userBody = {
      username,
      password: hashedPassword,
    };
    const user = await User.create(userBody);
    if (!user) throw new Error("not able to create user account");
    const token = createCookieAndToken(res, user);
    res.status(201).json({
      stauts: "success",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error("please enter an email or password");
    }
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("please enter a valid email or password");
    }
    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) {
      throw new Error("please enter a valid email or password");
    }

    const token = createCookieAndToken(res, user);
    res.status(200).json({
      status: "success",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: res.user.id } });
    res.status(200).json({
      status: "success",
      users,
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

exports.protected = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) {
      throw new Error("user not logged in");
    }
    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decode) throw new Error("please login to get access");
    const currentUser = await User.findById(decode.id);
    if (!currentUser) {
      throw new Error("please login");
    }
    res.user = currentUser;
    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user =await User.findById(res.user.id);
    if (!user) {
      throw new Error("user not found!");
    }
    res.status(200).json({
      status: "success",
      user,
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.send("logged out successfully");
};
