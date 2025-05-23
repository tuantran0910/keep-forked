import { ReactNode } from "react";
import { getIncidentWithErrorHandling } from "./getIncidentWithErrorHandling";
import { IncidentHeaderSkeleton } from "./incident-header-skeleton";
import { IncidentLayoutClient } from "./incident-layout-client";

export default async function Layout(
  props: {
    children: ReactNode;
    params: Promise<{ id: string }>;
  }
) {
  const serverParams = await props.params;

  const {
    children
  } = props;

  const AIEnabled =
    !!process.env.OPEN_AI_API_KEY || !!process.env.OPENAI_API_KEY;
  try {
    const incident = await getIncidentWithErrorHandling(serverParams.id);
    return (
      <IncidentLayoutClient initialIncident={incident} AIEnabled={AIEnabled}>
        {children}
      </IncidentLayoutClient>
    );
  } catch (error) {
    return (
      <div className="flex flex-col gap-4">
        <IncidentHeaderSkeleton />
        {children}
      </div>
    );
  }
}
