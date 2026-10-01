
export const site = {
  name: "Sanatan AI",
  // Set NEXT_PUBLIC_SITE_URL to override (for example on a preview deployment).
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sanatan.shivam.click").replace(/\/$/, ""),

  // Where "Open app" buttons go. This used to be sanatan.shivam.click, which is now this showcase site.
  appUrl: "https://sanatan-ai.vercel.app",
  repoUrl: "https://github.com/thesanatanai/sanatanai",

  author: { name: "Shivam Sharma", url: "https://shivam.click" },
  googleVerification: "uBdk-AkWWmrGQt7aYmEE0bgEboVTqpo6ws0tDA89azk",

  calendar: {
    url: "https://calendar.shivam.click",
    repoUrl: "https://github.com/thesanatanai/calendar",
  },

  gita: {
    repoUrl: "https://github.com/shivamsharma999/gita",
    // The Gita repo has no website set. Put the live address here and the visit button will use it
    // instead of the GitHub repo.
    liveUrl: "",
  },

  media: {
    demoVideo: "/demo.mp4",
    demoPoster: "/demo-poster.jpg",
  },
};
