import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "dealinno",
  project: "nextjs",
  widenClientFileUpload: true,
  disableLogger: true,
});
