const isDevelopment = process.env.NODE_ENV === "development";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDevelopment ? "http://localhost:8001" : "");

export const S3_PROXY_URL =
  process.env.NEXT_PUBLIC_S3_PROXY_URL ||
  (isDevelopment ? "http://localhost:8000" : "");

if (!process.env.NEXT_PUBLIC_API_URL && !isDevelopment) {
  console.error(
    "NEXT_PUBLIC_API_URL is not set; API requests will use the frontend origin."
  );
}
