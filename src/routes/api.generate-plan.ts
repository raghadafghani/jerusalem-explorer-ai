import { createFileRoute } from "@tanstack/react-router";
import { generatePlanData } from "@/server/generate-plan";

export const Route = createFileRoute("/api/generate-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const plan = await generatePlanData(body);
          return Response.json(plan);
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI_ERROR";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
