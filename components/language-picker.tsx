"use client";

// Language picker stub. Renders nothing today because there is only one
// supported locale. To enable:
//   1. Extend LOCALES in i18n/locales.ts.
//   2. Drop a sibling messages/<locale>/ directory mirroring messages/en/.
//   3. Add a loader entry in i18n/request.ts.
//   4. Uncomment the implementation below.
//
// The POST handler at /api/locale is already wired and accepts the new
// locale immediately.

// import { useRouter } from "next/navigation";
// import { useTransition } from "react";
// import { useLocale, useTranslations } from "next-intl";
//
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { LOCALES, isLocale } from "@/i18n/locales";

export function LanguagePicker() {
  return null;

  // const t = useTranslations("settings.language");
  // const router = useRouter();
  // const currentLocale = useLocale();
  // const [pending, startTransition] = useTransition();
  //
  // const onChange = (next: string) => {
  //   if (!isLocale(next)) return;
  //   startTransition(async () => {
  //     await fetch("/api/locale", {
  //       method: "POST",
  //       headers: { "content-type": "application/json" },
  //       body: JSON.stringify({ locale: next }),
  //     });
  //     router.refresh();
  //   });
  // };
  //
  // return (
  //   <Card>
  //     <CardHeader>
  //       <CardTitle>{t("title")}</CardTitle>
  //       <CardDescription>{t("description")}</CardDescription>
  //     </CardHeader>
  //     <CardContent className="max-w-xs">
  //       <Select
  //         value={currentLocale}
  //         onValueChange={onChange}
  //         disabled={pending}
  //       >
  //         <SelectTrigger>
  //           <SelectValue />
  //         </SelectTrigger>
  //         <SelectContent>
  //           {LOCALES.map((loc) => (
  //             <SelectItem key={loc} value={loc}>
  //               {t(`options.${loc}`)}
  //             </SelectItem>
  //           ))}
  //         </SelectContent>
  //       </Select>
  //     </CardContent>
  //   </Card>
  // );
}
