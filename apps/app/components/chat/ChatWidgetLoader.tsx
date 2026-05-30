"use client";
/**
 * ChatWidgetLoader — thin "use client" wrapper so that the ChatWidget
 * dynamic import with { ssr: false } is allowed (Server Components
 * cannot use next/dynamic with ssr:false directly).
 */
import dynamic from "next/dynamic";

const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

export default function ChatWidgetLoader() {
  return <ChatWidget />;
}
