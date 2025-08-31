import { createClient } from "@clickhouse/client";
import dotenv from "dotenv"
dotenv.config()

console.log(process.env.CLICKHOUSE_HOST);
console.log(process.env.CLICKHOUSE_USERNAME);
console.log(process.env.CLICKHOUSE_PASSWORD);
console.log(process.env.CLICKHOUSE_PASSWORD);



export const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
  tls: {
    rejectUnauthorized: false,
  },
});
