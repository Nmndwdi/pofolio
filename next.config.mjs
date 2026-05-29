/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Cloudinary — user-uploaded avatars and project images
      { protocol: "https", hostname: "res.cloudinary.com" },
      // GitHub avatars — pulled from the GitHub integration
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // GitHub user content (READMEs, project images referenced from repos)
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  /*
   * serverExternalPackages — packages that should NOT be bundled by the
   * Next compiler, but left as runtime require()s in the server build.
   *
   * In Next 14 this lived under experimental.serverComponentsExternalPackages;
   * Next 15+ graduated it to this top-level key.
   *
   * Why each is here:
   *   - puppeteer-core / @sparticuz/chromium: the PDF-export route launches a
   *     headless browser; the chromium binary must not be bundled.
   *   - pdf-parse / pdfjs-dist: the resume parser uses pdf-parse, which pulls
   *     in pdfjs-dist as an ES module. Bundling pdfjs-dist through the Next
   *     compiler breaks it ("Object.defineProperty called on non-object").
   *     Marking it external lets Node load it natively at runtime.
   */
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "pdf-parse",
    "pdfjs-dist",
  ],
};

export default nextConfig;
