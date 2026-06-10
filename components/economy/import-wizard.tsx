"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  commitEconomyImportMutation,
  createEconomyCategorizationRuleMutation,
  getEconomyAccountBalancesQueryKey,
  listEconomyAccountsOptions,
  listEconomyCategoriesOptions,
  listEconomyCategorizationRulesOptions,
  listEconomyCategorizationRulesQueryKey,
  listEconomyTransactionsQueryKey,
  previewEconomyImportMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  CommitImportResponse,
  ImportRowResponse,
  ImportRuleSuggestionResponse,
  NormalizedImportRowRequest,
  PreviewImportResponse,
} from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { ImportPreviewSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { flattenCategories } from "@/lib/economy/category-tree";
import {
  duplicateChip,
  IMPORT_DUPLICATE_STATE,
  isAtRuleCap,
  RULE_MATCH,
} from "@/lib/economy/categorization-rule";
import {
  CsvParseError,
  parseCsv,
  type ParsedCsv,
} from "@/lib/economy/csv-parse";
import {
  IMPORT_MAX_ROWS,
  validateImportRow,
} from "@/lib/economy/import-field-limits";
import {
  applyMapping,
  guessMapping,
  IMPORT_TARGET_FIELDS,
  type ColumnMapping,
  type ImportTargetField,
} from "@/lib/economy/import-mapping";
import {
  DEFAULT_IMPORT_STEP,
  parseAsImportStep,
} from "@/lib/economy/import-step";
import { formatEconomyDate } from "@/lib/economy/period";
import { useHousehold } from "@/lib/household-context";

const UNCATEGORIZED = "__none__";
const NO_COLUMN = "__nocol__";

/**
 * CSV import wizard. One route, internal steps via `?step=`; the target account
 * via `?accountId=` (both `nuqs`, so step+account survive navigation). The
 * parsed rows and preview response are too large for the URL, so they live in
 * component state — steps that need that state guard and bounce back to upload
 * when it's missing (e.g. after a hard refresh on `?step=preview`).
 *
 * Import is JSON: the browser parses the CSV and submits normalized rows.
 * Duplicate detection and category application are backend-computed (preview);
 * the `previewFingerprint` threads preview→commit as the double-commit guard.
 * Membership-gated.
 */
export function ImportWizard({ slug }: { slug: string }) {
  const t = useTranslations("economy.import");
  const { householdId } = useHousehold();

  const [step, setStep] = useQueryState("step", parseAsImportStep);
  const [accountId, setAccountId] = useQueryState("accountId");

  // In-memory wizard state — never in the URL.
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [normalizedRows, setNormalizedRows] = useState<
    NormalizedImportRowRequest[]
  >([]);
  const [preview, setPreview] = useState<PreviewImportResponse | null>(null);
  const [rowCategory, setRowCategory] = useState<Record<string, string | null>>(
    {},
  );
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [committed, setCommitted] = useState<CommitImportResponse | null>(null);

  const accountsQuery = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );
  const accounts = accountsQuery.data?.accounts ?? [];

  // Guard steps that can't render without their in-memory prerequisites.
  useEffect(() => {
    if (step === "map" && !parsed) setStep(DEFAULT_IMPORT_STEP);
    else if (step === "preview" && !preview) setStep(DEFAULT_IMPORT_STEP);
    else if (step === "done" && !committed) setStep(DEFAULT_IMPORT_STEP);
  }, [step, parsed, preview, committed, setStep]);

  const resetAll = () => {
    setParsed(null);
    setMapping({});
    setNormalizedRows([]);
    setPreview(null);
    setRowCategory({});
    setExcluded(new Set());
    setCommitted(null);
  };

  // A fresh file — or a failed re-parse (`null`) — invalidates everything
  // downstream. Clearing on failure matters: a stale previous file must not
  // stay importable behind an on-screen parse error.
  const onParsed = (next: ParsedCsv | null) => {
    setPreview(null);
    setCommitted(null);
    setRowCategory({});
    setExcluded(new Set());
    setNormalizedRows([]);
    setParsed(next);
    setMapping(next ? guessMapping(next.headers) : {});
  };

  const onPreviewed = (response: PreviewImportResponse) => {
    const category: Record<string, string | null> = {};
    const exclude = new Set<string>();
    for (const row of response.rows) {
      const key = String(row.rowNumber);
      category[key] = row.selectedCategoryId ?? row.suggestedCategoryId;
      // Default-exclude exact duplicates and rows with validation errors;
      // the user can re-include duplicates, but commit stays blocked while an
      // included row still has errors.
      if (
        row.duplicateState === IMPORT_DUPLICATE_STATE.Exact ||
        row.errors.length > 0
      ) {
        exclude.add(key);
      }
    }
    setRowCategory(category);
    setExcluded(exclude);
    setPreview(response);
    setStep("preview");
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </header>

      <StepIndicator current={step} />

      {step === "upload" ? (
        <UploadStep
          accountId={accountId}
          onAccountChange={setAccountId}
          accounts={accounts}
          parsed={parsed}
          onParsed={onParsed}
          canContinue={Boolean(parsed && accountId)}
          onContinue={() => setStep("map")}
        />
      ) : step === "map" && parsed ? (
        <MapStep
          parsed={parsed}
          mapping={mapping}
          onMappingChange={setMapping}
          accountId={accountId}
          onRows={setNormalizedRows}
          onBack={() => setStep("upload")}
          onPreviewed={onPreviewed}
        />
      ) : step === "preview" && preview ? (
        <PreviewStep
          preview={preview}
          rowCategory={rowCategory}
          setRowCategory={setRowCategory}
          excluded={excluded}
          setExcluded={setExcluded}
          normalizedRows={normalizedRows}
          accountId={accountId}
          onBack={() => setStep("map")}
          onCommitted={(result) => {
            setCommitted(result);
            setStep("done");
          }}
        />
      ) : step === "done" && committed ? (
        <DoneStep
          slug={slug}
          committed={committed}
          onImportAnother={() => {
            resetAll();
            setStep("upload");
          }}
        />
      ) : null}
    </div>
  );
}

function StepIndicator({ current }: { current: string }) {
  const t = useTranslations("economy.import.steps");
  const steps = ["upload", "map", "preview", "done"] as const;
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, index) => {
        const active = s === current;
        return (
          <li
            key={s}
            aria-current={active ? "step" : undefined}
            className={
              "rounded-none border px-2.5 py-1 " +
              (active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground")
            }
          >
            {`${index + 1}. ${t(s)}`}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Step 1: upload + account ─────────────────────────────────────────── */

function UploadStep({
  accountId,
  onAccountChange,
  accounts,
  parsed,
  onParsed,
  canContinue,
  onContinue,
}: {
  accountId: string | null;
  onAccountChange: (value: string) => void;
  accounts: Array<{ accountId: string; name: string }>;
  parsed: ParsedCsv | null;
  onParsed: (parsed: ParsedCsv | null) => void;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const t = useTranslations("economy.import.upload");
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setParsing(true);
    try {
      const result = await parseCsv(file);
      if (result.rows.length > IMPORT_MAX_ROWS) {
        onParsed(null);
        setError(
          t("tooManyRows", { max: IMPORT_MAX_ROWS, count: result.rows.length }),
        );
        return;
      }
      onParsed(result);
    } catch (cause) {
      onParsed(null);
      setError(
        cause instanceof CsvParseError && cause.code === "empty"
          ? t("emptyFile")
          : t("parseError"),
      );
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="grid max-w-xl gap-5">
      <Field>
        <FieldLabel htmlFor="import-account">{t("account.label")}</FieldLabel>
        <FieldContent>
          <Select
            value={accountId ?? ""}
            onValueChange={(value) => {
              if (value) onAccountChange(value);
            }}
          >
            <SelectTrigger id="import-account">
              <SelectValue placeholder={t("account.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.accountId} value={account.accountId}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t("account.hint")}</FieldDescription>
        </FieldContent>
      </Field>

      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="import-file">{t("file.label")}</FieldLabel>
        <FieldContent>
          <Input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            aria-invalid={Boolean(error)}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <FieldDescription>{t("file.hint")}</FieldDescription>
          <FieldError>{error}</FieldError>
        </FieldContent>
      </Field>

      {parsed ? (
        <p className="text-xs text-muted-foreground">
          {t("parsed", {
            rows: parsed.rows.length,
            columns: parsed.headers.length,
          })}
        </p>
      ) : null}

      <div>
        <Button disabled={!canContinue || parsing} onClick={onContinue}>
          {parsing ? t("parsing") : t("continue")}
        </Button>
      </div>
    </div>
  );
}

/* ── Step 2: field mapping ────────────────────────────────────────────── */

function MapStep({
  parsed,
  mapping,
  onMappingChange,
  accountId,
  onRows,
  onBack,
  onPreviewed,
}: {
  parsed: ParsedCsv;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  accountId: string | null;
  onRows: (rows: NormalizedImportRowRequest[]) => void;
  onBack: () => void;
  onPreviewed: (response: PreviewImportResponse) => void;
}) {
  const t = useTranslations("economy.import.map");
  const { householdId } = useHousehold();

  const rows = useMemo(
    () => applyMapping(parsed.rows, mapping),
    [parsed.rows, mapping],
  );
  const violationCount = useMemo(
    () =>
      rows.filter((row) => Object.keys(validateImportRow(row)).length > 0)
        .length,
    [rows],
  );

  const previewMutation = useMutation({
    ...previewEconomyImportMutation(),
    onSuccess: (data) => {
      onRows(rows);
      onPreviewed(data);
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const setColumn = (field: ImportTargetField, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === NO_COLUMN ? null : Number(value),
    });
  };

  // occurredOn + amount are the minimum a meaningful import needs.
  const requiredMapped =
    mapping.occurredOn !== undefined &&
    mapping.occurredOn !== null &&
    mapping.amount !== undefined &&
    mapping.amount !== null;
  const canContinue =
    Boolean(accountId) && requiredMapped && violationCount === 0;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="grid max-w-xl gap-4">
        {IMPORT_TARGET_FIELDS.map((field) => {
          const value = mapping[field];
          return (
            <Field key={field} orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`map-${field}`}>
                  {t(`fields.${field}`)}
                </FieldLabel>
              </FieldContent>
              <Select
                value={
                  value === null || value === undefined
                    ? NO_COLUMN
                    : String(value)
                }
                onValueChange={(next) => {
                  if (next) setColumn(field, next);
                }}
              >
                <SelectTrigger id={`map-${field}`} className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COLUMN}>{t("noColumn")}</SelectItem>
                  {parsed.headers.map((header, index) => (
                    <SelectItem
                      key={`${header}-${index}`}
                      value={String(index)}
                    >
                      {header || t("unnamedColumn", { index: index + 1 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        })}
      </div>

      {!requiredMapped ? (
        <p className="text-xs text-muted-foreground">{t("requiredHint")}</p>
      ) : null}
      {violationCount > 0 ? (
        <p className="text-xs text-destructive">
          {t("violations", { count: violationCount })}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          disabled={!canContinue || previewMutation.isPending}
          onClick={() =>
            accountId &&
            previewMutation.mutate({
              body: { householdId, accountId, rows },
            })
          }
        >
          {previewMutation.isPending ? t("previewing") : t("continue")}
        </Button>
      </div>
    </div>
  );
}

/* ── Step 3: preview + commit ─────────────────────────────────────────── */

function PreviewStep({
  preview,
  rowCategory,
  setRowCategory,
  excluded,
  setExcluded,
  normalizedRows,
  accountId,
  onBack,
  onCommitted,
}: {
  preview: PreviewImportResponse;
  rowCategory: Record<string, string | null>;
  setRowCategory: React.Dispatch<
    React.SetStateAction<Record<string, string | null>>
  >;
  excluded: Set<string>;
  setExcluded: React.Dispatch<React.SetStateAction<Set<string>>>;
  normalizedRows: NormalizedImportRowRequest[];
  accountId: string | null;
  onBack: () => void;
  onCommitted: (result: CommitImportResponse) => void;
}) {
  const t = useTranslations("economy.import.preview");
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const flatCategories = flattenCategories(
    categoriesQuery.data?.categories ?? [],
  );

  const acceptedCount = preview.rows.length - excluded.size;
  // Rows whose preview reported errors can't be committed — the whole commit
  // would fail server-side with no per-row guidance. They're default-excluded
  // (in `onPreviewed`); if the user re-includes one, block commit with a hint.
  const includedHasErrors = preview.rows.some(
    (row) => !excluded.has(String(row.rowNumber)) && row.errors.length > 0,
  );

  const commitMutation = useMutation({
    ...commitEconomyImportMutation(),
    onSuccess: async (data) => {
      await invalidateAfterImport(queryClient, householdId);
      onCommitted(data);
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const toggleExcluded = (key: string, included: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (included) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const commit = () => {
    if (!accountId) return;
    const byRow = new Map(
      normalizedRows.map((row) => [String(row.rowNumber), row]),
    );
    const rows: NormalizedImportRowRequest[] = preview.rows
      .filter((row) => !excluded.has(String(row.rowNumber)))
      .map((row) => {
        const key = String(row.rowNumber);
        const original = byRow.get(key);
        return {
          ...(original ?? fallbackRow(row)),
          categoryId: rowCategory[key] ?? null,
        };
      });
    commitMutation.mutate({
      body: {
        householdId,
        accountId,
        previewFingerprint: preview.previewFingerprint,
        rows,
      },
    });
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {t("summary", { accepted: acceptedCount, total: preview.rows.length })}
      </p>

      {categoriesQuery.isLoading ? (
        <ImportPreviewSkeleton />
      ) : (
        <ul className="grid gap-2">
          {/* Keyed by rowNumber (the stable 1-based source row), NOT
              rowFingerprint — content-derived fingerprints collide on
              identical rows, the exact duplicate case this screen handles. */}
          {preview.rows.map((row) => (
            <PreviewRow
              key={row.rowNumber}
              row={row}
              flatCategories={flatCategories}
              included={!excluded.has(String(row.rowNumber))}
              onIncludedChange={(included) =>
                toggleExcluded(String(row.rowNumber), included)
              }
              category={rowCategory[String(row.rowNumber)] ?? null}
              onCategoryChange={(value) =>
                setRowCategory((prev) => ({
                  ...prev,
                  [String(row.rowNumber)]: value,
                }))
              }
            />
          ))}
        </ul>
      )}

      {includedHasErrors ? (
        <p className="text-xs text-destructive">{t("includedErrorsHint")}</p>
      ) : null}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          disabled={
            acceptedCount === 0 ||
            includedHasErrors ||
            commitMutation.isPending ||
            !accountId
          }
          onClick={commit}
        >
          {commitMutation.isPending
            ? t("committing")
            : t("commit", { count: acceptedCount })}
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({
  row,
  flatCategories,
  included,
  onIncludedChange,
  category,
  onCategoryChange,
}: {
  row: ImportRowResponse;
  flatCategories: ReturnType<typeof flattenCategories>;
  included: boolean;
  onIncludedChange: (included: boolean) => void;
  category: string | null;
  onCategoryChange: (value: string | null) => void;
}) {
  const t = useTranslations("economy.import.preview");
  const chip = duplicateChip(row.duplicateState);
  const label =
    row.description ?? row.counterparty ?? row.rawDescription ?? "—";

  return (
    <li className="grid gap-2 border px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 items-start gap-2">
          <Checkbox
            checked={included}
            onCheckedChange={(checked) => onIncludedChange(checked === true)}
            aria-label={t("include")}
          />
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-sm">{label}</span>
            <span className="text-xs text-muted-foreground">
              {row.occurredOn ? formatEconomyDate(row.occurredOn) : "—"}
            </span>
          </span>
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={chip === "dup" ? "destructive" : "secondary"}>
            {t(`chip.${chip}`)}
          </Badge>
          {row.amount ? (
            <Money value={row.amount} className="text-sm font-medium" />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6">
        <Select
          value={category ?? UNCATEGORIZED}
          onValueChange={(value) =>
            onCategoryChange(value === UNCATEGORIZED ? null : value)
          }
        >
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder={t("uncategorized")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNCATEGORIZED}>{t("uncategorized")}</SelectItem>
            {flatCategories.map(({ category: c, depth }) => (
              <SelectItem key={c.categoryId} value={c.categoryId}>
                {`${"  ".repeat(depth)}${c.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {row.suggestedSubscriptionMatches.length > 0 ? (
          <Badge variant="outline">{t("subscriptionHint")}</Badge>
        ) : null}
      </div>

      {row.errors.length > 0 ? (
        <ul className="grid gap-0.5 pl-6">
          {row.errors.map((error) => (
            <li
              key={`${error.field}:${error.message}`}
              className="text-xs text-destructive"
            >
              {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/* ── Step 4: done + rule suggestions ──────────────────────────────────── */

function DoneStep({
  slug,
  committed,
  onImportAnother,
}: {
  slug: string;
  committed: CommitImportResponse;
  onImportAnother: () => void;
}) {
  const t = useTranslations("economy.import.done");
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery(
    listEconomyCategorizationRulesOptions({ query: { householdId } }),
  );
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const categoryName = useMemo(
    () =>
      new Map(
        flattenCategories(categoriesQuery.data?.categories ?? []).map((f) => [
          f.category.categoryId,
          f.category.name,
        ]),
      ),
    [categoriesQuery.data],
  );

  const existingRules = useMemo(
    () => rulesQuery.data?.rules ?? [],
    [rulesQuery.data],
  );
  const atCap = isAtRuleCap(existingRules);
  const [createdKeys, setCreatedKeys] = useState<Set<string>>(new Set());

  // Filter suggestions that already exist as a rule (same match + pattern +
  // target) so we don't offer to create a duplicate.
  const suggestions = useMemo(() => {
    const existing = new Set(
      existingRules.map((r) =>
        suggestionKey(r.match, r.pattern, r.targetCategoryId),
      ),
    );
    return committed.suggestedRules.filter(
      (s) =>
        !existing.has(suggestionKey(s.match, s.pattern, s.targetCategoryId)),
    );
  }, [committed.suggestedRules, existingRules]);

  const createMutation = useMutation({
    ...createEconomyCategorizationRuleMutation(),
    // Mark the suggestion "Created" only after the backend says so — adding
    // optimistically would leave a permanently disabled button on failure
    // (e.g. a 422 at the rule cap) with no way to retry. The button is already
    // disabled by `isPending` while the call is in flight.
    onSuccess: async (created) => {
      setCreatedKeys((prev) =>
        new Set(prev).add(
          suggestionKey(
            created.match,
            created.pattern,
            created.targetCategoryId,
          ),
        ),
      );
      await queryClient.invalidateQueries({
        queryKey: listEconomyCategorizationRulesQueryKey({
          query: { householdId },
        }),
      });
      toast.success(t("ruleCreated"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const createRule = (suggestion: ImportRuleSuggestionResponse) => {
    createMutation.mutate({
      body: {
        householdId,
        match: suggestion.match,
        pattern: suggestion.pattern,
        targetCategoryId: suggestion.targetCategoryId,
      },
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 border p-4">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            {t("imported", { count: Number(committed.importedCount) })}
          </span>
          <span className="text-muted-foreground">
            {t("duplicates", { count: Number(committed.duplicateCount) })}
          </span>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <section className="grid gap-2">
          <div className="grid gap-0.5">
            <h3 className="text-sm font-semibold">{t("suggestions.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("suggestions.description")}
            </p>
          </div>
          <ul className="grid gap-2">
            {suggestions.map((suggestion) => {
              const key = suggestionKey(
                suggestion.match,
                suggestion.pattern,
                suggestion.targetCategoryId,
              );
              const created = createdKeys.has(key);
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-4 border px-3 py-2.5"
                >
                  <div className="grid min-w-0 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          suggestion.match === RULE_MATCH.Regex
                            ? "default"
                            : "secondary"
                        }
                      >
                        {t(`match.${suggestion.match}`)}
                      </Badge>
                      <code className="truncate text-sm">
                        {suggestion.pattern}
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {`→ ${categoryName.get(suggestion.targetCategoryId) ?? t("unknownCategory")}`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={created || atCap || createMutation.isPending}
                    onClick={() => createRule(suggestion)}
                  >
                    {created
                      ? t("suggestions.created")
                      : t("suggestions.create")}
                  </Button>
                </li>
              );
            })}
          </ul>
          {atCap ? (
            <p className="text-xs text-muted-foreground">
              {t("suggestions.capHint")}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onImportAnother}>{t("importAnother")}</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/app/h/${slug}/economy/transactions`} />}
        >
          {t("viewTransactions")}
        </Button>
      </div>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function suggestionKey(match: string, pattern: string, target: string): string {
  return `${match}::${pattern}::${target}`;
}

/**
 * Reconstruct a normalized row from a preview row when the original mapped row
 * isn't available (defensive — they're keyed by the same `rowNumber`). The
 * preview echoes a `MoneyResponse` amount; flatten it back to the scalar shape.
 */
function fallbackRow(row: ImportRowResponse): NormalizedImportRowRequest {
  return {
    rowNumber: row.rowNumber,
    occurredOn: row.occurredOn,
    amount: row.amount?.amount ?? null,
    description: row.description,
    currency: row.currency,
    counterparty: row.counterparty,
    reference: row.reference,
    balanceAfter: row.balanceAfter
      ? { amount: row.balanceAfter.amount, currency: row.balanceAfter.currency }
      : null,
    rawDescription: row.rawDescription,
    categoryId: null,
  };
}

/**
 * A commit books real transactions, shifting balances and budget actuals, so
 * invalidate the transactions list, account balances, and every budget-summary
 * period for the household (predicate match — same pattern as
 * `recurring-bills-page` / `transfer-form`).
 */
async function invalidateAfterImport(
  queryClient: QueryClient,
  householdId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      queryKey: getEconomyAccountBalancesQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as {
          _id?: string;
          query?: { householdId?: string };
        };
        return (
          key?._id === "getEconomyBudgetSummary" &&
          key?.query?.householdId === householdId
        );
      },
    }),
  ]);
}
