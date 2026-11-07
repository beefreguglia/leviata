/* eslint-disable @next/next/no-img-element -- miniaturas externas (Twitch/Kick/YouTube) */
import { EyeIcon, RadioIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { STREAM_PLATFORM } from "@/lib/labels";
import { STREAM_URL } from "@/lib/streams";
import { fmtAgo } from "@/lib/dates";
import type { Member, StreamChannel } from "@/generated/prisma/client";

export function LiveCard({ channel }: { channel: StreamChannel & { member: Member } }) {
  return (
    <a
      href={STREAM_URL[channel.platform](channel.handle)}
      target="_blank"
      rel="noreferrer"
      data-testid="live-card"
      className="group flex flex-col overflow-hidden rounded-card bg-card transition-colors hover:bg-grey-700"
    >
      <div className="relative aspect-video bg-input">
        {channel.thumbnailUrl ? (
          <img src={channel.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <RadioIcon className="size-8 text-grey-600" />
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex h-6 items-center gap-1.5 rounded-full bg-danger-base px-2.5 text-xs font-bold text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-white" /> AO VIVO
        </span>
        {channel.viewers != null && (
          <span className="absolute bottom-3 left-3 inline-flex h-6 items-center gap-1 rounded-full bg-grey-950/80 px-2.5 text-xs font-bold text-grey-100 backdrop-blur">
            <EyeIcon className="size-3.5" /> {channel.viewers.toLocaleString("pt-BR")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-grey-100">{channel.member.rpName}</span>
          <StatusBadge {...STREAM_PLATFORM[channel.platform]} />
        </div>
        {channel.title && <p className="line-clamp-2 text-sm text-grey-300">{channel.title}</p>}
        <p className="text-xs text-muted-foreground">
          {channel.category ? `${channel.category} · ` : ""}
          {channel.startedAt ? `começou ${fmtAgo(channel.startedAt)}` : "ao vivo"}
        </p>
      </div>
    </a>
  );
}
