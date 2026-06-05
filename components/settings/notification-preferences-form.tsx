"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getMyNotificationPreferencesOptions,
  updateMyNotificationPreferencesMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { MyNotificationPreferenceResponse } from "@/api/generated";
import { notificationCategoryKey } from "@/components/notifications-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function NotificationPreferencesForm() {
  const t = useTranslations("settingsForms.notificationPreferences");
  const tCategory = useTranslations("components.notifications.category");
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery(getMyNotificationPreferencesOptions());
  const updatePreferences = useMutation(
    updateMyNotificationPreferencesMutation(),
  );
  const [overrides, setOverrides] = useState<
    Record<string, Partial<MyNotificationPreferenceResponse>>
  >({});
  const preferences = (preferencesQuery.data?.preferences ?? []).map(
    (preference) => ({
      ...preference,
      ...overrides[preference.category],
    }),
  );

  function updatePreference(
    category: number,
    key: "bellEnabled" | "emailEnabled",
    value: boolean,
  ) {
    setOverrides((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [key]: value,
      },
    }));
  }

  async function savePreferences() {
    await updatePreferences.mutateAsync({
      body: {
        preferences: preferences.flatMap((preference) =>
          preference.isLocked
            ? []
            : [
                {
                  category: preference.category,
                  bellEnabled: preference.bellEnabled,
                  emailEnabled: preference.emailEnabled,
                },
              ],
        ),
      },
    });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [params] = query.queryKey as Array<{ _id?: string }>;
        return params?._id === "getMyNotificationPreferences";
      },
    });
    setOverrides({});
    toast.success(t("saved"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.category")}</TableHead>
                <TableHead>{t("table.bell")}</TableHead>
                <TableHead>{t("table.email")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.map((preference) => (
                <TableRow key={preference.category}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {tCategory(notificationCategoryKey(preference.category))}
                      {preference.isLocked && (
                        <Badge variant="outline">
                          <LockIcon className="size-3" />
                          {t("locked")}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={preference.bellEnabled}
                      disabled={
                        preference.isLocked || updatePreferences.isPending
                      }
                      onCheckedChange={(checked) =>
                        updatePreference(
                          preference.category,
                          "bellEnabled",
                          checked === true,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={preference.emailEnabled}
                      disabled={
                        preference.isLocked || updatePreferences.isPending
                      }
                      onCheckedChange={(checked) =>
                        updatePreference(
                          preference.category,
                          "emailEnabled",
                          checked === true,
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button
          type="button"
          className="w-fit"
          disabled={updatePreferences.isPending || preferencesQuery.isLoading}
          onClick={() => {
            void savePreferences();
          }}
        >
          {updatePreferences.isPending ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
