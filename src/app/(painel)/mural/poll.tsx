import { CheckIcon, VoteIcon } from "lucide-react";
import { ActionForm } from "@/components/forms/action-form";
import { cn } from "@/lib/utils";
import { pct, type NoticeWithPoll } from "@/lib/polls";
import { votePoll } from "./actions";

/** Enquete do aviso: cada opção é um botão com a barra de resultado por trás. */
export function Poll({ notice, closed }: { notice: NoticeWithPoll; closed: boolean }) {
  const total = notice._count.pollVotes;
  const mine = notice.pollVotes[0]?.optionId;
  return (
    <section aria-label={`Enquete: ${notice.title}`} className="flex flex-col gap-2" data-testid="poll">
      {notice.pollOptions.map((o) => {
        const votes = o._count.votes;
        const p = pct(votes, total);
        const isMine = o.id === mine;
        return (
          <ActionForm key={o.id} action={votePoll.bind(null, notice.id, o.id)}>
            <button
              type="submit"
              disabled={closed}
              aria-pressed={isMine}
              aria-label={`${o.text} — ${votes} ${votes === 1 ? "voto" : "votos"}`}
              className={cn(
                "relative flex min-h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-md border-2 px-4 text-left text-base transition-colors",
                isMine ? "border-primary" : "border-transparent bg-input",
                closed ? "cursor-default" : "hover:border-grey-500",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("absolute inset-y-0 left-0 transition-[width] duration-500", isMine ? "bg-cyan-low" : "bg-grey-600")}
                style={{ width: `${p}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2">
                {isMine && <CheckIcon className="size-4 shrink-0 text-primary" />}
                <span className="truncate text-grey-100">{o.text}</span>
              </span>
              <span className="relative shrink-0 text-sm font-bold tabular-nums text-grey-200">{p}%</span>
            </button>
          </ActionForm>
        );
      })}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <VoteIcon className="size-4" />
        {total} {total === 1 ? "voto" : "votos"}
        {closed ? " · enquete encerrada" : mine ? " · toque de novo para tirar o voto" : " · toque numa opção para votar"}
      </p>
    </section>
  );
}
