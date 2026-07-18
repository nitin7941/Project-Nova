export interface Feature {
  slug: string;
  href: string;
  api: string;
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  inputLabel: string;
  placeholder: string;
  cta: string;
  /** Owner column so hackathon teammates can claim a module. */
  owner: string;
}

export const features: Feature[] = [
  {
    slug: "review",
    href: "/review",
    api: "/api/review",
    name: "AI Code Review",
    tagline: "Catch bugs, security holes, and smells before your teammates do.",
    icon: "🔍",
    accent: "from-fuchsia-500 to-purple-600",
    inputLabel: "Paste code to review",
    placeholder: "// Paste a function, file, or diff here...",
    cta: "Review code",
    owner: "Teammate A",
  },
  {
    slug: "tests",
    href: "/tests",
    api: "/api/tests",
    name: "Unit Test Generator",
    tagline: "Local folder or GitHub → generate & validate. New project: requirements → test cases.",
    icon: "🧪",
    accent: "from-emerald-500 to-teal-600",
    inputLabel: "Project folder or GitHub",
    placeholder: "Select a local project folder…",
    cta: "Generate tests",
    owner: "Vishal",
  },
  {
    slug: "docs",
    href: "/docs",
    api: "/api/docs",
    name: "Docs & API Generator",
    tagline: "Turn code into clean, accurate developer documentation.",
    icon: "📚",
    accent: "from-sky-500 to-blue-600",
    inputLabel: "Paste code or API to document",
    placeholder: "// Paste code, a module, or an API handler...",
    cta: "Generate docs",
    owner: "Teammate C",
  },
  {
    slug: "design",
    href: "/design",
    api: "/api/design",
    name: "Requirements → Design",
    tagline: "Translate requirements into a pragmatic system design + diagram.",
    icon: "🏗️",
    accent: "from-amber-500 to-orange-600",
    inputLabel: "Describe the requirements",
    placeholder: "We need a platform that lets teams...",
    cta: "Design system",
    owner: "Teammate D",
  },
];

export const featureBySlug = (slug: string) => features.find((f) => f.slug === slug);
