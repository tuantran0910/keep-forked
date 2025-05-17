import { ReactNode } from "react";

export default function AIAssistantLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Get real-time insights and assistance for your alerts and incidents
        </p>
      </div>
      {children}
    </div>
  );
}
