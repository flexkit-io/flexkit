import type { JSX } from 'react';
import { useState } from 'react';
import { formatDistance } from 'date-fns';
import { BotIcon, RadarIcon, XIcon } from 'lucide-react';
import useSWR from 'swr';
import { Button, Tooltip, TooltipContent, TooltipTrigger, toast } from '../../../ui';
import { fetcher, paths, type ApiClient } from '../api';
import type { AgentChatDetail, AgentChatMessage, AgentChatMonitor } from '../types';

/** A batch of one monitor's events, as stored on its `monitor_event` message. */
export interface MonitorEventData {
  description: string;
  events: Array<{ createdAt: string; id: string; summary: string }>;
  monitorId: string;
  total: number;
}

export function getMonitorEventData(message: Pick<AgentChatMessage, 'parts'>): MonitorEventData | null {
  const part = (Array.isArray(message.parts) ? message.parts : []).find((item) => item.type === 'data-monitor-event');

  return part && typeof part.data === 'object' && part.data !== null ? (part.data as MonitorEventData) : null;
}

/**
 * What a chat monitor delivered. It sits where a user message would, but was
 * sent by the monitor, so it reads as a notice rather than a bubble.
 */
export function MonitorEventCard({ data, error }: { data: MonitorEventData; error?: string | null }): JSX.Element {
  const hidden = data.total - data.events.length;

  return (
    <div className="fk:mr-auto fk:w-full fk:max-w-[85%] fk:space-y-1.5 fk:rounded-lg fk:border fk:border-border fk:bg-muted/40 fk:px-3.5 fk:py-2.5 fk:text-sm fk:corner-squircle">
      <div className="fk:flex fk:items-center fk:gap-2 fk:text-xs fk:text-muted-foreground">
        <RadarIcon className="fk:size-3.5 fk:shrink-0" />
        <span className="fk:truncate">Monitor · {data.description}</span>
      </div>
      <ul className="fk:space-y-0.5">
        {data.events.map((event) => (
          <li key={event.id}>{event.summary}</li>
        ))}
        {hidden > 0 ? <li className="fk:text-muted-foreground">…and {hidden.toString()} more</li> : null}
      </ul>
      {error ? <p className="fk:text-xs fk:text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * "Watching: … · expires in 20 hours · Turn into automation · Stop" above the
 * composer, one per active monitor. A job monitor ends with its job, so it
 * cannot become an automation.
 */
export function MonitorChips({
  api,
  chatId,
  onTurnIntoAutomation,
  projectId,
  sending = false,
}: {
  api: ApiClient;
  chatId: string;
  /** Asks the agent in the chat to propose an automation that replaces the monitor. */
  onTurnIntoAutomation?: (_monitor: AgentChatMonitor) => void;
  projectId: string;
  /** A message is being sent; Turn into automation waits for it. */
  sending?: boolean;
}): JSX.Element | null {
  // Shares the chat page's cached detail (same key); no request of its own.
  const { data, mutate } = useSWR<AgentChatDetail>(paths(projectId).agentChat(chatId), fetcher, { revalidateOnMount: false });
  const [stopping, setStopping] = useState<string | null>(null);
  const monitors = data?.monitors ?? [];

  if (monitors.length === 0) {
    return null;
  }

  async function stop(monitor: AgentChatMonitor): Promise<void> {
    setStopping(monitor.id);

    try {
      await api.stopAgentChatMonitor(chatId, monitor.id);
      await mutate();
    } catch {
      toast.error('Unable to stop the monitor.');
    } finally {
      setStopping(null);
    }
  }

  return (
    <div className="fk:mx-auto fk:mb-2 fk:flex fk:max-w-4xl fk:flex-wrap fk:gap-2">
      {monitors.map((monitor) => (
        <div
          className="fk:flex fk:max-w-full fk:items-center fk:gap-2 fk:rounded-full fk:border fk:border-border fk:py-1 fk:pl-3 fk:pr-1 fk:text-xs fk:text-muted-foreground"
          key={monitor.id}
        >
          <RadarIcon className="fk:size-3.5 fk:shrink-0 fk:animate-pulse" />
          <span className="fk:truncate">
            Watching: {monitor.description} · expires {formatDistance(new Date(monitor.expiresAt), new Date(), { addSuffix: true })}
          </span>
          {onTurnIntoAutomation && monitor.sourceType && monitor.sourceType !== 'job' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Turn ${monitor.description} into an automation`}
                  className="fk:size-6 fk:rounded-full"
                  disabled={sending}
                  size="icon"
                  variant="ghost"
                  onClick={() => onTurnIntoAutomation(monitor)}
                >
                  <BotIcon className="fk:size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Turn into automation</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Stop watching ${monitor.description}`}
                className="fk:size-6 fk:rounded-full"
                disabled={stopping === monitor.id}
                size="icon"
                variant="ghost"
                onClick={() => void stop(monitor)}
              >
                <XIcon className="fk:size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop watching</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
