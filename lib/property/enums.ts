import type {
  HistoryEntryType,
  MaintenanceOccurrenceStatus,
  MaintenanceRecurrenceUnit,
  ProjectStatus,
  ProjectTaskStatus,
} from "@/api/generated";
import {
  zHistoryEntryType,
  zMaintenanceOccurrenceStatus,
  zMaintenanceRecurrenceUnit,
  zProjectStatus,
  zProjectTaskStatus,
} from "@/api/generated/zod.gen";

/**
 * Property enum presentation glue — NOT the source of truth.
 *
 * The enums themselves are first-class OpenAPI schemas now, so the literal
 * union types (`ProjectStatus`, …) and `z.enum`s (`zProjectStatus`, …) come
 * from `api/generated`. This module only adds the two things the generated
 * code can't express:
 *
 * 1. an **ordered array** of values per enum, for `<select>` options (a union
 *    type carries no order), and
 * 2. a **message-id map** per enum, pointing at the i18n leaf in
 *    `messages/en/property.json` (`property.enums.<group>.<value>`).
 *
 * The arrays are derived from the generated `z*.enum`'s `.options`, so adding
 * a backend value surfaces as a TS error in the message map below rather than
 * a silently-unlabelled option. Selects must only ever offer these values —
 * the backend returns 422 on anything else.
 */

export const PROJECT_STATUS_OPTIONS: readonly ProjectStatus[] =
  zProjectStatus.options;
export const PROJECT_TASK_STATUS_OPTIONS: readonly ProjectTaskStatus[] =
  zProjectTaskStatus.options;
export const MAINTENANCE_RECURRENCE_UNIT_OPTIONS: readonly MaintenanceRecurrenceUnit[] =
  zMaintenanceRecurrenceUnit.options;
export const MAINTENANCE_OCCURRENCE_STATUS_OPTIONS: readonly MaintenanceOccurrenceStatus[] =
  zMaintenanceOccurrenceStatus.options;
export const HISTORY_ENTRY_TYPE_OPTIONS: readonly HistoryEntryType[] =
  zHistoryEntryType.options;

/**
 * Full i18n message ids per enum value. Keyed by the union type, so a new
 * backend value (which widens the union) makes these maps fail to typecheck
 * until a label is added. Components can also scope a namespace and translate
 * the bare value (`useTranslations("property.enums.projectStatus")(status)`),
 * since the leaf key equals the value — these maps are for callers without a
 * scoped namespace handy.
 */
export const PROJECT_STATUS_LABEL_KEY: Record<ProjectStatus, string> = {
  Planning: "property.enums.projectStatus.Planning",
  Active: "property.enums.projectStatus.Active",
  OnHold: "property.enums.projectStatus.OnHold",
  Done: "property.enums.projectStatus.Done",
};

export const PROJECT_TASK_STATUS_LABEL_KEY: Record<ProjectTaskStatus, string> =
  {
    Todo: "property.enums.taskStatus.Todo",
    Doing: "property.enums.taskStatus.Doing",
    Done: "property.enums.taskStatus.Done",
  };

export const MAINTENANCE_RECURRENCE_UNIT_LABEL_KEY: Record<
  MaintenanceRecurrenceUnit,
  string
> = {
  Month: "property.enums.recurrenceUnit.Month",
  Year: "property.enums.recurrenceUnit.Year",
};

export const MAINTENANCE_OCCURRENCE_STATUS_LABEL_KEY: Record<
  MaintenanceOccurrenceStatus,
  string
> = {
  Upcoming: "property.enums.occurrenceStatus.Upcoming",
  Done: "property.enums.occurrenceStatus.Done",
  Skipped: "property.enums.occurrenceStatus.Skipped",
};

export const HISTORY_ENTRY_TYPE_LABEL_KEY: Record<HistoryEntryType, string> = {
  Project: "property.enums.historyType.Project",
  Maintenance: "property.enums.historyType.Maintenance",
  Manual: "property.enums.historyType.Manual",
};
