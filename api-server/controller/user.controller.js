import { userSchema } from "../zodSchema.js";
import { prismaClient } from "../db/prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  try {
    const safeParse = userSchema.safeParse(req.body);
    if (safeParse.error) {
      return res.status(400).json({ error: "invalid input" });
    }
    const { username, password } = safeParse.data;
    const existingUser = await prismaClient.user.findUnique({
      where: {
        username,
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: "username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    const token = generateToken(user.id);
    res.status(201).json({
      message: "user registered successfully",
      success: true,
      user: {
        id: user.id,
        username: user.username,
        token: token,
      },
    });
  } catch (error) {
    console.log("register err :", error);
    res.status(400).json({ message: "internel server err" });
  }
};

const login = async (req, res) => {
  try {
    const safeParse = userSchema.safeParse(req.body);
    if (safeParse.error) {
      return res.status(400).json(safeParse.error);
    }
    const { username, password } = safeParse.data;
    const user = await prismaClient.user.findUnique({
      where: {
        username,
      },
    });
    if (!user) {
      return res.status(400).json({ message: "invalid username or password" });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "invalid username or password" });
    }
    const token = generateToken(user.id);
    res.status(200).json({ message: "login success", token:token });
  } catch (error) {
    console.log("login err :", error);
    res.status(400).json({ message: "internel server err" });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const projects = await prismaClient.project.findMany({
      where: {
        userId: req.userId,
      },
      include: {
        deployments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });
    res.status(200).json({ projects });
  } catch (error) {
    res.status(400).json({ message: "err while fetching projects" });
  }
};

export { register, login, getAllProjects };
