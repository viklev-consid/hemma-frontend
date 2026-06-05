"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";

type AvatarLike =
  | {
      url: string;
    }
  | null
  | undefined;

type UserLike = {
  displayName?: string | null;
  avatar?: AvatarLike;
};

type UserAvatarProps = {
  user: UserLike;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function UserAvatar({
  user,
  size = "default",
  className,
}: UserAvatarProps) {
  const src = resolveAvatarUrl(user.avatar?.url);
  const initials = computeInitials(user.displayName);

  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn("uppercase")}>{initials}</AvatarFallback>
    </Avatar>
  );
}

function computeInitials(displayName: string | null | undefined): string {
  if (!displayName) {
    return "?";
  }

  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}` || "?";
}
