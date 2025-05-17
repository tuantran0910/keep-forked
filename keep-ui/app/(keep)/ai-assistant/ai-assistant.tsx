"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AIAssistantChat } from "@/shared/ui/AIAssistant/AIAssistantChat";
import {
  Card,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useHydratedSession } from "@/shared/lib/hooks/useHydratedSession";

export default function AIAssistant() {
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useHydratedSession();
  const searchParams = useSearchParams();
  const conversationId = searchParams?.get("conversationId") || null;

  const handleError = (errorMessage: string) => {
    console.error("AI Assistant error:", errorMessage);
    setError(errorMessage);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <TabGroup className="mb-[-16px]">
          <TabList className="mt-2">
            <Tab icon={ChatBubbleLeftRightIcon}>Chat Assistant</Tab>
            <Tab icon={InformationCircleIcon}>About</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <div className="h-[calc(105vh-280px)] overflow-hidden">
                {error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="bg-red-100 text-red-700 p-4 rounded-lg inline-block">
                        <BoltIcon className="h-8 w-8 mx-auto" />
                      </div>
                      <p className="text-red-600 mt-4">{error}</p>
                      <button
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => setError(null)}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <AIAssistantChat
                    title="Keep AI Assistant"
                    initialMessage="Hello! I'm your Keep AI Assistant. I can help you with alerts, incidents, and other tasks in the Keep platform. How can I assist you today?"
                    placeholder="Ask me anything about your alerts and incidents..."
                    userId={session?.user?.email || "current-user"}
                    conversationId={conversationId || undefined}
                    onError={handleError}
                  />
                )}
              </div>
            </TabPanel>

            <TabPanel>
              <div className="space-y-6 py-4">
                <div>
                  <Title>Keep AI Assistant</Title>
                  <Text className="mt-2">
                    The Keep AI Assistant is designed to help you manage and
                    understand your alerts and incidents more effectively. It
                    uses advanced AI to provide insights, recommendations, and
                    assistance with your monitoring and incident response
                    workflows.
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Natural Conversation
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Ask questions in plain language about your alerts,
                          incidents, and monitoring data.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <InformationCircleIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Contextual Insights
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Get relevant information and insights based on your
                          specific alerts and incidents.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <BoltIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Quick Actions
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Perform common tasks and get recommendations for
                          resolving issues faster.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-6 w-6 text-amber-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Continuous Learning
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          The assistant learns from your interactions to provide
                          increasingly relevant assistance.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>
    </div>
  );
}
