"use client";

import { Disclosure } from "@headlessui/react";
import { Subtitle } from "@tremor/react";
import { IoChevronUp } from "react-icons/io5";
import { Session } from "next-auth";
import { LinkWithIcon } from "components/LinkWithIcon";
import { BsLightningChargeFill } from "react-icons/bs";
import clsx from "clsx";

type AIAssistantLinksProps = {
  session: Session | null;
};

export const AIAssistantLinks = ({ session }: AIAssistantLinksProps) => {
  if (!session) return null;

  return (
    <Disclosure as="div" className="space-y-1" defaultOpen>
      {({ open }) => (
        <>
          <Disclosure.Button className="w-full flex justify-between items-center px-2">
            <div className="flex items-center relative group">
              <Subtitle className="text-xs ml-2 text-gray-900 font-medium uppercase">
                AI Assistant
              </Subtitle>
            </div>
            <IoChevronUp
              className={clsx("mr-2 text-slate-400", {
                "rotate-180": open,
              })}
            />
          </Disclosure.Button>

          <Disclosure.Panel as="ul" className="space-y-0.5 p-1 pr-1">
            <li>
              <LinkWithIcon
                href="/ai-assistant"
                icon={BsLightningChargeFill}
                testId="menu-ai-assistant"
              >
                <Subtitle className="text-xs">Chat</Subtitle>
              </LinkWithIcon>
            </li>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
