import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
const localAddresses = Object.values(networkInterfaces()).flatMap((entries) =>
  (entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address),
);
const config: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...localAddresses],
};
export default config;
