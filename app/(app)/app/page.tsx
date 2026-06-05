import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ActivityIcon,
  CheckCircle2Icon,
  ClockIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app");
  return { title: t("dashboard") };
}

/**
 * Cross-org dashboard.
 *
 * Placeholder widgets for the application landing area. Real product
 * metrics should replace these once the domain modules arrive; the org
 * picker remains the entry point for selecting and creating organizations.
 */
export default async function DashboardPage() {
  const tDash = await getTranslations("app.dashboard");

  const stats = [
    {
      label: tDash("stats.activeUsers"),
      value: "1,284",
      detail: tDash("stats.activeUsersDetail"),
      icon: UsersIcon,
    },
    {
      label: tDash("stats.workflowRuns"),
      value: "342",
      detail: tDash("stats.workflowRunsDetail"),
      icon: ActivityIcon,
    },
    {
      label: tDash("stats.approvals"),
      value: "18",
      detail: tDash("stats.approvalsDetail"),
      icon: ClockIcon,
    },
  ];

  const activity = [
    {
      title: tDash("activity.items.invites.title"),
      body: tDash("activity.items.invites.body"),
      time: tDash("activity.items.invites.time"),
    },
    {
      title: tDash("activity.items.audit.title"),
      body: tDash("activity.items.audit.body"),
      time: tDash("activity.items.audit.time"),
    },
    {
      title: tDash("activity.items.policy.title"),
      body: tDash("activity.items.policy.body"),
      time: tDash("activity.items.policy.time"),
    },
  ];

  const health = [
    tDash("health.items.sync"),
    tDash("health.items.permissions"),
    tDash("health.items.notifications"),
  ];

  return (
    <section className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">{tDash("title")}</h1>
        <p className="text-sm text-muted-foreground">{tDash("body")}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} size="sm">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-xs text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="grid gap-1">
                <div className="text-2xl font-semibold tabular-nums">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>{tDash("activity.title")}</CardTitle>
                <CardDescription>
                  {tDash("activity.description")}
                </CardDescription>
              </div>
              <Badge variant="secondary">{tDash("placeholder")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {activity.map((item) => (
                <div
                  key={item.title}
                  className="grid gap-1 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tDash("health.title")}</CardTitle>
            <CardDescription>{tDash("health.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {health.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{item}</span>
                </div>
                <Badge variant="outline">{tDash("health.ok")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </section>
  );
}
