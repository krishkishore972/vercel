import jwt from "jsonwebtoken";


const verifyToken = async (req, res, next) => {
     const token = req.header("Authorization");
     if (!token) {
       return res.status(401).json({ error: "Access denied" });
     }
    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        req.userId = decoded.userId;
        next()
    } catch (error) {
        res.status(401).json({error:"invalid token"});
    }
}
export default verifyToken;
