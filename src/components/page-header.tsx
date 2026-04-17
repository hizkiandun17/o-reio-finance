import * as React from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2 md:space-y-3">
        <p className="command-label">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 self-start sm:flex-row sm:flex-wrap lg:w-auto lg:self-auto lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
