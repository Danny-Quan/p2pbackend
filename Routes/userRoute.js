const express = require("express");
const {
  registerUser,
  getUsers,
  protected,
  loginUser,
  logout,
  getMe,
} = require("./../Controllers/userController");

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);
router.get("/me", protected, getMe);
router.get("/getusers", protected, getUsers);

module.exports = router;
