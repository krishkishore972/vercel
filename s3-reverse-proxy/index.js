import express from "express";
import httpProxy from "http-proxy";
import { PrismaClient } from "./generated/prisma/index.js";
const app = express();
const port = 8000;

const proxy = new httpProxy();
const BASE_URL = "https://s3.ap-south-1.amazonaws.com/vercel.builds/__outputs"
const prismaClient = new PrismaClient();

app.use( async (req, res) => {
  const hostname = req.hostname; // a1.localhost:800
  const subdomain = hostname.split(".")[0];//a1
  // Custom Domain - DB Query
  // DB Query = prisma.
  const project = await prismaClient.project.findFirst({
    where: {
      subDomain: subdomain,
    },
  });
  console.log(project);

  const id = project?.id;
  if(!id) {
    return res.status(404).json({message:"project not found"});
  }
  const targetUrl = `${BASE_URL}/${id}`;
  return proxy.web(req,res,{target:targetUrl,changeOrigin:true});
});

proxy.on("proxyReq",(proxyReq,req,res) => {
    const url = req.url;
    if(url === "/"){
        proxyReq.path += "index.html"
    }
});

app.listen(port, () => {
  console.log("server is running on port :", port);
});
