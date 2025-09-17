import { createClient } from "@clickhouse/client";
import dotenv from "dotenv"
dotenv.config()


export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
  tls: {
    rejectUnauthorized: false,
  },
});
