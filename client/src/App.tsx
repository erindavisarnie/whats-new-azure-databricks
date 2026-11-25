import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { BookOpen, ExternalLink, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------------------------------------
// Config: which table to read (set per deployment via WHATS_NEW_TABLE)
// ---------------------------------------------------------------------------------------------------------

function useAppConfig() {
  const [tableName, setTableName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c: { tableName: string }) => setTableName(c.tableName))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  return { tableName, error };
}

export default function App() {
  const { tableName, error } = useAppConfig();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-6">
        {error && <ErrorAlert title="Could not load app configuration" message={error} />}
        {!error && !tableName && <Skeleton className="h-24 w-full" />}
        {tableName && <WhatsNew tableName={tableName} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Stage helpers: one place that maps release stage → label + badge variant
// ---------------------------------------------------------------------------------------------------------

type StageFilter = 'all' | 'ga' | 'preview' | 'enhancement';

const STAGE_FILTERS: { value: StageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ga', label: 'Generally available' },
  { value: 'preview', label: 'Beta & Preview' },
  { value: 'enhancement', label: 'Enhancements' },
];

function matchesStage(stage: string, filter: StageFilter) {
  if (filter === 'all') return true;
  if (filter === 'ga') return stage === 'GA';
  if (filter === 'preview') return stage === 'Beta' || stage === 'Public Preview';
  return stage === 'Enhancement';
}

function StageBadge({ stage }: { stage: string }) {
  const variant = stage === 'GA' ? 'default' : stage === 'Enhancement' ? 'outline' : 'secondary';
  return <Badge variant={variant}>{stage === 'GA' ? 'Generally available' : stage}</Badge>;
}

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

type DocLink = { text: string; url: string };
// The analytics JSON transport auto-parses JSON-looking strings, so `doc_links_json` can arrive as an
// already-decoded array even though typegen declares it a string. Accept both.
function parseDocLinks(raw: unknown): DocLink[] {
  if (!raw) return [];
  try {
    const v: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (l): l is DocLink =>
        typeof l === 'object' && l !== null && typeof (l as DocLink).url === 'string' && typeof (l as DocLink).text === 'string',
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------------------------------------

const ALL = '__all__';

function WhatsNew({ tableName }: { tableName: string }) {
  const [category, setCategory] = useState<string>(ALL);
  const [stage, setStage] = useState<StageFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const info = useAnalyticsQuery('snapshot_info', { table_name: sql.string(tableName) });
  const cats = useAnalyticsQuery('categories', { table_name: sql.string(tableName) });
  const feats = useAnalyticsQuery('features', {
    table_name: sql.string(tableName),
    category: sql.string(category === ALL ? '' : category),
  });

  const visible = useMemo(
    () => (feats.data ?? []).filter((f) => matchesStage(f.release_stage, stage)),
    [feats.data, stage],
  );
  // Keep the detail pane in sync: default to the first visible feature when the selection drops out
  const selected = visible.find((f) => f.entry_id === selectedId) ?? visible[0] ?? null;

  const snapshot = info.data?.[0];

  return (
    <>
      {/* Header: what this is, the window it covers, and freshness */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-wide">Azure Databricks</span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">What&apos;s new this month</h1>
        {info.loading && <Skeleton className="h-5 w-96" />}
        {info.error && <ErrorAlert title="Could not load snapshot info" message={info.error} />}
        {snapshot && (
          <p className="text-muted-foreground">
            {snapshot.total_features} features released {formatDate(snapshot.window_start)} – today ·{' '}
            {snapshot.ga} generally available · {snapshot.preview_beta} in Beta or Preview
            <span className="block text-xs mt-1">
              Source: Azure Databricks release notes · Refreshed {formatDate(snapshot.refreshed_at)} · Descriptions
              are AI-assisted summaries, so check the linked documentation for details.
            </span>
          </p>
        )}
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="space-y-2 md:w-80">
          <Label htmlFor="category">Category</Label>
          {cats.loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setSelectedId(null);
              }}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories ({snapshot?.total_features ?? '…'})</SelectItem>
                {(cats.data ?? []).map((c) => (
                  <SelectItem key={c.category} value={c.category}>
                    {c.category} ({c.features})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {cats.error && <p className="text-sm text-destructive">{cats.error}</p>}
        </div>
        <div className="space-y-2">
          <Label>Release stage</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={stage}
            onValueChange={(v) => v && setStage(v as StageFilter)}
          >
            {STAGE_FILTERS.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value} className="px-3">
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Master / detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">
              {category === ALL ? 'All categories' : category}
            </CardTitle>
            <CardDescription>
              {feats.loading ? 'Loading features…' : `${visible.length} feature${visible.length === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            {feats.loading && (
              <div className="space-y-3 px-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}
            {feats.error && <ErrorAlert title="Could not load features" message={feats.error} />}
            {!feats.loading && !feats.error && visible.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No features match</EmptyTitle>
                  <EmptyDescription>Try another release stage or pick “All categories”.</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" onClick={() => setStage('all')}>
                  Show all stages
                </Button>
              </Empty>
            )}
            {visible.length > 0 && (
              <ScrollArea className="h-[60vh] pr-2">
                <ul className="space-y-1" aria-label="Features">
                  {visible.map((f) => {
                    const active = selected?.entry_id === f.entry_id;
                    return (
                      <li key={f.entry_id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(f.entry_id)}
                          aria-current={active}
                          className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                            active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium leading-snug text-foreground">{f.feature_name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <StageBadge stage={f.release_stage} />
                            <span>{formatDate(f.release_date)}</span>
                            {category === ALL && <span>· {f.category}</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <FeatureDetail feature={selected} loading={feats.loading} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Detail pane
// ---------------------------------------------------------------------------------------------------------

type Feature = {
  entry_id: string;
  feature_name: string;
  category: string;
  release_stage: string;
  release_date: string;
  summary: string;
  why_it_matters: string | null;
  release_note: string;
  primary_doc_url: string;
  doc_links_json: string | null;
  release_note_url: string;
};

function FeatureDetail({ feature, loading }: { feature: Feature | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    );
  }
  if (!feature) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Select a feature</EmptyTitle>
              <EmptyDescription>Pick a feature from the list to see what it does and where to learn more.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const links = parseDocLinks(feature.doc_links_json);
  const otherLinks = links.filter((l) => l.url !== feature.primary_doc_url);

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={feature.release_stage} />
          <Badge variant="outline">{feature.category}</Badge>
          <span className="text-sm text-muted-foreground">Released {formatDate(feature.release_date)}</span>
        </div>
        <CardTitle className="text-2xl leading-tight">{feature.feature_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-foreground leading-relaxed">{feature.summary}</p>

        {feature.why_it_matters && (
          <div className="rounded-md border-l-4 border-primary bg-muted px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</div>
            <p className="mt-1 text-foreground">{feature.why_it_matters}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={feature.primary_doc_url} target="_blank" rel="noreferrer">
              <BookOpen className="h-4 w-4" aria-hidden /> Read the documentation
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={feature.release_note_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden /> Release note
            </a>
          </Button>
        </div>

        {otherLinks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Related documentation</div>
            <ul className="space-y-1">
              {otherLinks.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {l.text || l.url} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Original release note text</summary>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{feature.release_note}</p>
        </details>
      </CardContent>
    </Card>
  );
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
