/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ssw.com.au/rules",
  changefreq: "daily",
  priority: 0.7,
  sitemapBaseFileName: "sitemap-index",
  sitemapSize: 5000,
  generateRobotsTxt: true,
  output: "standalone",
  outDir: "public/",
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
  },
};
