import { accounts, channels } from "@/lib/mock-data";

export function getSourceDisplayName(sourceId: string) {
  return (
    channels.find((channel) => channel.id === sourceId)?.name ??
    accounts.find((account) => account.id === sourceId)?.name ??
    sourceId
  );
}
