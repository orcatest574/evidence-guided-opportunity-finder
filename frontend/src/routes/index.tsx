import { createFileRoute } from "@tanstack/react-router";
import { ScienceParkApp } from "@/components/science-park-app";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Your innovation workspace | Virtual Science Park" },
    { name: "description", content: "Discover source-backed company profiles, personalised testing and funding opportunities, and potential connections in Blue Science Park." },
    { property: "og:title", content: "Virtual Science Park | Your innovation workspace" },
    { property: "og:description", content: "Explore company intelligence and relevant opportunities within the Blue Science Park ecosystem." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ScienceParkApp,
});
