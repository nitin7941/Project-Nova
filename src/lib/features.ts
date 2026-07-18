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
  /** Show a "load a file from a GitHub URL" input in the workbench. */
  supportsGithubUrl?: boolean;
}

export const features: Feature[] = [
  {
    slug: "chat",
    href: "/chat",
    api: "/api/rag/chat",
    name: "Chat with your Codebase",
    tagline: "Index a Git repo or folder and ask questions grounded in the real code.",
    icon: "🧠",
    accent: "from-violet-500 to-fuchsia-600",
    inputLabel: "Ask about the codebase",
    placeholder: "How does authentication work?",
    cta: "Ask Nova",
    owner: "Nitin",
  },
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
    owner: "Nitin",
    supportsGithubUrl: true,
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
    tagline:
      "User manuals, API refs, runbooks — from a local folder, GitHub directory, or interview.",
    icon: "📚",
    accent: "from-sky-500 to-blue-600",
    inputLabel: "Project folder to document",
    placeholder: "Select a local project folder…",
    cta: "Generate docs",
    owner: "Vishal",
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
    owner: "Sahil",
  },
  {
    slug: "trace",
    href: "/trace",
    api: "/api/trace/project",
    name: "Traceability & Drift",
    tagline: "Link requirement → design → review → tests → docs, and flag what goes stale when upstream changes.",
    icon: "🕸️",
    accent: "from-rose-500 to-amber-600",
    inputLabel: "Requirement to trace",
    placeholder: "Users can reset their password via email.",
    cta: "Trace it",
    owner: "Nitin",
  },
];

export const featureBySlug = (slug: string) => features.find((f) => f.slug === slug);
