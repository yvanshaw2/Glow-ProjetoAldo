"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

// A tab of /admin/settings that reads its route (docs/configuracoes/
// configuracoes-do-painel.md) in the states of docs/padroes/componentes.md
// (RNF004).

type SettingsSectionProps<T> = {
  path: string;
  // The place of the fields while loading.
  skeletonCount: number;
  children: (settings: T) => ReactNode;
};

export function SettingsSection<T>({
  path,
  skeletonCount,
  children,
}: SettingsSectionProps<T>) {
  const { data, error, reload } = useApiQuery<T>(path);
  return (
    <div className="flex flex-col gap-6">
      {data !== null && children(data)}
      {data === null && error && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col items-start gap-3">
            {error.message}
            <Button variant="secondary" onClick={reload}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {data === null && !error && (
        <div aria-busy className="flex flex-col gap-5">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
