import { ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RestrictedState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="surface-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="size-5 text-chart-3" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
