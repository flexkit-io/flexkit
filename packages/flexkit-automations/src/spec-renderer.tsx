import type { JSX } from 'react';
import type { ComponentRegistry, ComponentRenderer, Spec } from '@json-render/react';
import { useEffect, useId, useMemo, useState } from 'react';
import { ActionProvider, Renderer, StateProvider, VisibilityProvider, buildSpecFromParts } from '@json-render/react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  LightbulbIcon,
  MinusIcon,
  OctagonAlertIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  ExternalLink,
  Separator as SeparatorPrimitive,
  Skeleton as SkeletonPrimitive,
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs as TabsPrimitive,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@flexkit/studio/ui';

// ---------------------------------------------------------------------------
// Layout components
// ---------------------------------------------------------------------------

interface CardProps {
  centered: boolean | null;
  className: string | null;
  description: string | null;
  maxWidth: 'sm' | 'md' | 'lg' | 'full' | null;
  title: string | null;
}

const cardMaxWidthClasses = {
  sm: 'fk:max-w-sm',
  md: 'fk:max-w-md',
  lg: 'fk:max-w-lg',
  full: 'fk:max-w-full',
};

const Card: ComponentRenderer<CardProps> = ({ children, element }) => {
  const { props } = element;
  const maxWidthClass = props.maxWidth ? cardMaxWidthClasses[props.maxWidth] : '';
  const centeredClass = props.centered ? 'fk:mx-auto' : '';

  return (
    <div
      className={`fk:w-full fk:rounded-lg fk:border fk:border-border fk:bg-card fk:p-4 fk:gap-2 fk:flex fk:flex-col ${maxWidthClass} ${centeredClass} ${props.className ?? ''}`}
    >
      {props.title && <div className="fk:text-sm fk:font-medium">{props.title}</div>}
      {props.description && <div className="fk:mt-0.5 fk:text-xs fk:text-muted-foreground">{props.description}</div>}
      {(props.title ?? props.description) && children ? <div className="fk:mt-3" /> : null}
      {children}
    </div>
  );
};

interface StackProps {
  align: 'start' | 'center' | 'end' | 'stretch' | null;
  className: string | null;
  direction: 'horizontal' | 'vertical' | null;
  gap: 'none' | 'sm' | 'md' | 'lg' | 'xl' | null;
  justify: 'start' | 'center' | 'end' | 'between' | 'around' | null;
}

const stackGapClasses = {
  none: 'fk:gap-0',
  sm: 'fk:gap-2',
  md: 'fk:gap-3',
  lg: 'fk:gap-4',
  xl: 'fk:gap-6',
};

const stackAlignClasses = {
  start: 'fk:items-start',
  center: 'fk:items-center',
  end: 'fk:items-end',
  stretch: 'fk:items-stretch',
};

const stackJustifyClasses = {
  start: 'fk:justify-start',
  center: 'fk:justify-center',
  end: 'fk:justify-end',
  between: 'fk:justify-between',
  around: 'fk:justify-around',
};

const Stack: ComponentRenderer<StackProps> = ({ children, element }) => {
  const { props } = element;
  const directionClass = props.direction === 'horizontal' ? 'fk:flex-row fk:flex-wrap' : 'fk:flex-col';
  const gapClass = stackGapClasses[props.gap ?? 'md'];
  const alignClass = props.align ? stackAlignClasses[props.align] : '';
  const justifyClass = props.justify ? stackJustifyClasses[props.justify] : '';

  return (
    <div
      className={`fk:flex fk:w-full ${directionClass} ${gapClass} ${alignClass} ${justifyClass} ${props.className ?? ''}`}
    >
      {children}
    </div>
  );
};

interface GridProps {
  className: string | null;
  columns: number | null;
  gap: 'sm' | 'md' | 'lg' | 'xl' | null;
}

const gridColumnClasses: { [columns: number]: string } = {
  1: 'fk:grid-cols-1',
  2: 'fk:grid-cols-2',
  3: 'fk:grid-cols-3',
  4: 'fk:grid-cols-4',
  5: 'fk:grid-cols-5',
  6: 'fk:grid-cols-6',
};

const gridGapClasses = {
  sm: 'fk:gap-2',
  md: 'fk:gap-3',
  lg: 'fk:gap-4',
  xl: 'fk:gap-6',
};

const Grid: ComponentRenderer<GridProps> = ({ children, element }) => {
  const { props } = element;
  const columnClass = gridColumnClasses[props.columns ?? 1] ?? 'fk:grid-cols-1';
  const gapClass = gridGapClasses[props.gap ?? 'md'];

  return <div className={`fk:grid fk:w-full ${columnClass} ${gapClass} ${props.className ?? ''}`}>{children}</div>;
};

const Separator: ComponentRenderer<{ orientation: 'horizontal' | 'vertical' | null }> = ({ element }) => (
  <SeparatorPrimitive orientation={element.props.orientation ?? 'horizontal'} />
);

// ---------------------------------------------------------------------------
// Typography and content components
// ---------------------------------------------------------------------------

interface HeadingProps {
  level: 'h1' | 'h2' | 'h3' | 'h4' | null;
  text: string;
}

const headingClasses = {
  h1: 'fk:text-xl fk:font-semibold fk:tracking-tight',
  h2: 'fk:text-lg fk:font-semibold fk:tracking-tight',
  h3: 'fk:text-base fk:font-medium',
  h4: 'fk:text-sm fk:font-medium',
};

const Heading: ComponentRenderer<HeadingProps> = ({ element }) => {
  const level = element.props.level ?? 'h2';
  const HeadingTag = level;

  return <HeadingTag className={headingClasses[level]}>{element.props.text}</HeadingTag>;
};

interface TextProps {
  text: string;
  variant: 'body' | 'muted' | 'caption' | 'lead' | 'code' | null;
}

const textClasses = {
  body: 'fk:text-sm',
  muted: 'fk:text-sm fk:text-muted-foreground',
  caption: 'fk:text-xs fk:text-muted-foreground',
  lead: 'fk:text-base',
  code: 'fk:rounded fk:bg-muted fk:px-1 fk:py-0.5 fk:font-mono fk:text-xs',
};

const Text: ComponentRenderer<TextProps> = ({ element }) => (
  <p className={textClasses[element.props.variant ?? 'body']}>{element.props.text}</p>
);

interface BadgeProps {
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | null;
}

const BadgeComponent: ComponentRenderer<BadgeProps> = ({ element }) => (
  <Badge variant={element.props.variant ?? 'default'}>{element.props.text}</Badge>
);

interface AlertProps {
  message: string | null;
  title: string;
  type: 'success' | 'info' | 'warning' | 'error' | null;
}

function AlertIcon({ type }: { type: AlertProps['type'] }): JSX.Element {
  switch (type) {
    case 'success':
      return <CheckCircle2Icon className="fk:size-4 fk:translate-y-0.5" />;
    case 'warning':
      return <AlertTriangleIcon className="fk:size-4 fk:translate-y-0.5" />;
    case 'error':
      return <XCircleIcon className="fk:size-4 fk:translate-y-0.5" />;
    default:
      return <InfoIcon className="fk:size-4 fk:translate-y-0.5" />;
  }
}

const Alert: ComponentRenderer<AlertProps> = ({ element }) => {
  const { props } = element;
  const typeClass = props.type === 'error' ? 'fk:border-destructive/50 fk:text-destructive' : 'fk:text-foreground';

  return (
    <div
      className={`fk:flex fk:w-full fk:gap-3 fk:rounded-lg fk:border fk:bg-card fk:px-4 fk:py-3 fk:text-sm ${typeClass}`}
      role="alert"
    >
      <AlertIcon type={props.type} />
      <div className="fk:min-w-0">
        <div className="fk:font-medium">{props.title}</div>
        {props.message && <div className="fk:text-muted-foreground">{props.message}</div>}
      </div>
    </div>
  );
};

interface TableProps {
  caption: string | null;
  columns: string[];
  rows: string[][];
}

const Table: ComponentRenderer<TableProps> = ({ element }) => {
  const columns = element.props.columns ?? [];
  const rows = (element.props.rows ?? []).map((row) => row.map(String));

  return (
    <div className="fk:w-full fk:overflow-hidden fk:rounded-md fk:mt-2">
      <TablePrimitive>
        {element.props.caption && <TableCaption>{element.props.caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TablePrimitive>
    </div>
  );
};

interface ProgressProps {
  label: string | null;
  max: number | null;
  value: number;
}

const Progress: ComponentRenderer<ProgressProps> = ({ element }) => {
  const { props } = element;
  const max = props.max ?? 100;
  const percent = max > 0 ? Math.min(100, Math.max(0, (props.value / max) * 100)) : 0;

  return (
    <div className="fk:w-full">
      {props.label && (
        <div className="fk:mb-1 fk:flex fk:items-center fk:justify-between fk:text-xs fk:text-muted-foreground">
          <span>{props.label}</span>
          <span className="fk:tabular-nums">{Math.round(percent)}%</span>
        </div>
      )}
      <div className="fk:h-2 fk:w-full fk:overflow-hidden fk:rounded-full fk:bg-secondary">
        <div className="fk:h-full fk:rounded-full fk:bg-primary" style={{ width: `${percent.toString()}%` }} />
      </div>
    </div>
  );
};

const Skeleton: ComponentRenderer<{ height: string | null; rounded: boolean | null; width: string | null }> = ({
  element,
}) => (
  <SkeletonPrimitive
    className={element.props.rounded ? 'fk:rounded-full' : ''}
    style={{ height: element.props.height ?? '1rem', width: element.props.width ?? '100%' }}
  />
);

const LinkComponent: ComponentRenderer<{ href: string; label: string }> = ({ element }) => (
  <ExternalLink href={element.props.href}>{element.props.label}</ExternalLink>
);

const Image: ComponentRenderer<{
  alt: string;
  height: number | null;
  src: string | null;
  width: number | null;
}> = ({ element }) => {
  if (!element.props.src) {
    return null;
  }

  return (
    <img
      alt={element.props.alt}
      className="fk:max-w-full fk:rounded-md"
      height={element.props.height ?? undefined}
      src={element.props.src}
      width={element.props.width ?? undefined}
    />
  );
};

interface AccordionProps {
  items: { content: string; title: string }[];
  type: 'single' | 'multiple' | null;
}

const Accordion: ComponentRenderer<AccordionProps> = ({ element }) => (
  <div className="fk:w-full fk:divide-y fk:divide-border fk:rounded-md fk:border fk:border-border">
    {(element.props.items ?? []).map((item, index) => (
      <details className="fk:group fk:px-4 fk:py-3" key={index}>
        <summary className="fk:cursor-pointer fk:list-none fk:text-sm fk:font-medium">{item.title}</summary>
        <p className="fk:mt-2 fk:text-sm fk:text-muted-foreground">{item.content}</p>
      </details>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

interface TabsProps {
  defaultValue: string | null;
  tabs: { label: string; value: string }[];
  value: string | null;
}

const Tabs: ComponentRenderer<TabsProps> = ({ children, element }) => {
  const tabs = element.props.tabs ?? [];

  return (
    <TabsPrimitive defaultValue={element.props.value ?? element.props.defaultValue ?? tabs[0]?.value}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </TabsPrimitive>
  );
};

const TabContent: ComponentRenderer<{ value: string }> = ({ children, element }) => (
  <TabsContent value={element.props.value}>{children}</TabsContent>
);

// ---------------------------------------------------------------------------
// Result-focused components (Metric, Callout, Timeline)
// ---------------------------------------------------------------------------

interface MetricProps {
  detail: string | null;
  label: string;
  trend: 'up' | 'down' | 'neutral' | null;
  value: string;
}

const trendClasses = {
  up: 'fk:text-success',
  down: 'fk:text-destructive',
  neutral: 'fk:text-muted-foreground',
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }): JSX.Element {
  if (trend === 'up') {
    return <TrendingUpIcon className="fk:size-4" />;
  }

  if (trend === 'down') {
    return <TrendingDownIcon className="fk:size-4" />;
  }

  return <MinusIcon className="fk:size-4" />;
}

const Metric: ComponentRenderer<MetricProps> = ({ element }) => {
  const { props } = element;

  return (
    <div className="fk:w-full fk:rounded-lg fk:border fk:border-border fk:bg-card fk:p-4">
      <div className="fk:text-xs fk:font-medium fk:text-muted-foreground">{props.label}</div>
      <div className="fk:mt-1 fk:flex fk:items-center fk:gap-2">
        <span className="fk:text-2xl fk:font-semibold fk:tabular-nums fk:tracking-tight">{props.value}</span>
        {props.trend && (
          <span className={trendClasses[props.trend]}>
            <TrendIcon trend={props.trend} />
          </span>
        )}
      </div>
      {props.detail && <div className="fk:mt-1 fk:text-xs fk:text-muted-foreground">{props.detail}</div>}
    </div>
  );
};

interface CalloutProps {
  content: string;
  title: string | null;
  type: 'info' | 'tip' | 'warning' | 'important' | null;
}

const calloutClasses = {
  info: 'fk:border-blue-500/30 fk:bg-blue-500/5 fk:text-blue-700 fk:dark:text-blue-400',
  tip: 'fk:border-emerald-500/30 fk:bg-emerald-500/5 fk:text-emerald-700 fk:dark:text-emerald-400',
  warning: 'fk:border-amber-500/30 fk:bg-amber-500/5 fk:text-amber-700 fk:dark:text-amber-400',
  important: 'fk:border-red-500/30 fk:bg-red-500/5 fk:text-red-700 fk:dark:text-red-400',
};

function CalloutIcon({ type }: { type: 'info' | 'tip' | 'warning' | 'important' }): JSX.Element {
  switch (type) {
    case 'tip':
      return <LightbulbIcon className="fk:size-4 fk:shrink-0 fk:translate-y-0.5" />;
    case 'warning':
      return <AlertTriangleIcon className="fk:size-4 fk:shrink-0 fk:translate-y-0.5" />;
    case 'important':
      return <OctagonAlertIcon className="fk:size-4 fk:shrink-0 fk:translate-y-0.5" />;
    default:
      return <InfoIcon className="fk:size-4 fk:shrink-0 fk:translate-y-0.5" />;
  }
}

const Callout: ComponentRenderer<CalloutProps> = ({ element }) => {
  const { props } = element;
  const type = props.type ?? 'info';

  return (
    <div
      className={`fk:flex fk:w-full fk:gap-3 fk:rounded-lg fk:border fk:px-4 fk:py-3 fk:text-sm ${calloutClasses[type]}`}
    >
      <CalloutIcon type={type} />
      <div className="fk:min-w-0">
        {props.title && <div className="fk:font-medium">{props.title}</div>}
        <div className="fk:text-foreground">{props.content}</div>
      </div>
    </div>
  );
};

interface TimelineProps {
  items: {
    date: string | null;
    description: string | null;
    status: 'completed' | 'current' | 'upcoming' | null;
    title: string;
  }[];
}

const timelineDotClasses = {
  completed: 'fk:border-success fk:bg-success',
  current: 'fk:border-primary fk:bg-primary',
  upcoming: 'fk:border-border fk:bg-background',
};

const Timeline: ComponentRenderer<TimelineProps> = ({ element }) => (
  <div className="fk:w-full">
    {(element.props.items ?? []).map((item, index, items) => (
      <div className="fk:relative fk:flex fk:gap-3 fk:pb-4 fk:last:pb-0" key={index}>
        {index < items.length - 1 && (
          <div className="fk:absolute fk:left-[5px] fk:top-4 fk:h-full fk:w-px fk:bg-border" />
        )}
        <div
          className={`fk:mt-1 fk:size-[11px] fk:shrink-0 fk:rounded-full fk:border-2 ${timelineDotClasses[item.status ?? 'upcoming']}`}
        />
        <div className="fk:min-w-0">
          <div className="fk:flex fk:flex-wrap fk:items-baseline fk:gap-x-2">
            <span className="fk:text-sm fk:font-medium">{item.title}</span>
            {item.date && <span className="fk:text-xs fk:text-muted-foreground">{item.date}</span>}
          </div>
          {item.description && <div className="fk:text-sm fk:text-muted-foreground">{item.description}</div>}
        </div>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const chartTooltipStyle = {
  background: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

const chartTooltipItemStyle = {
  color: 'hsl(var(--foreground))',
};

const chartTooltipLabelStyle = {
  color: 'hsl(var(--foreground))',
};

const chartTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

interface ChartPoint {
  x: string;
  y: number;
}

interface CartesianChartProps {
  aggregate: 'sum' | 'count' | 'avg' | null;
  color: string | null;
  data: { [key: string]: unknown }[];
  height: number | null;
  title: string | null;
  xKey: string;
  yKey: string;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getChartPoints(props: CartesianChartProps): ChartPoint[] {
  const data = props.data ?? [];

  if (!props.aggregate) {
    return data.map((row) => ({
      x: String(row[props.xKey] ?? ''),
      y: toNumber(row[props.yKey]),
    }));
  }

  const groups = new Map<string, { count: number; sum: number }>();

  for (const row of data) {
    const key = String(row[props.xKey] ?? '');
    const group = groups.get(key) ?? { count: 0, sum: 0 };

    group.count += 1;
    group.sum += toNumber(row[props.yKey]);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([x, group]) => {
    if (props.aggregate === 'count') {
      return { x, y: group.count };
    }

    if (props.aggregate === 'avg') {
      return { x, y: group.count === 0 ? 0 : group.sum / group.count };
    }

    return { x, y: group.sum };
  });
}

function ChartFrame({
  children,
  height,
  title,
}: {
  children: JSX.Element;
  height: number | null;
  title: string | null;
}): JSX.Element {
  return (
    <div className="fk:w-full">
      {title && <div className="fk:mb-2 fk:text-sm fk:font-medium">{title}</div>}
      <div style={{ height: height ?? 256 }}>
        <ResponsiveContainer height="100%" width="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const BarChart: ComponentRenderer<CartesianChartProps> = ({ element }) => {
  const points = getChartPoints(element.props);
  const color = element.props.color ?? CHART_COLORS[0];

  return (
    <ChartFrame height={element.props.height} title={element.props.title}>
      <RechartsBarChart data={points}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis axisLine={false} dataKey="x" tick={chartTick} tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tick={chartTick} tickLine={false} width={40} />
        <RechartsTooltip
          contentStyle={chartTooltipStyle}
          cursor={{ fill: 'hsl(var(--muted))' }}
          itemStyle={chartTooltipItemStyle}
          labelStyle={chartTooltipLabelStyle}
        />
        <Bar dataKey="y" fill={color} isAnimationActive={false} name={element.props.yKey} radius={4} />
      </RechartsBarChart>
    </ChartFrame>
  );
};

const LineChart: ComponentRenderer<CartesianChartProps> = ({ element }) => {
  const points = getChartPoints(element.props);
  const color = element.props.color ?? CHART_COLORS[0];

  return (
    <ChartFrame height={element.props.height} title={element.props.title}>
      <RechartsLineChart data={points}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis axisLine={false} dataKey="x" tick={chartTick} tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tick={chartTick} tickLine={false} width={40} />
        <RechartsTooltip
          contentStyle={chartTooltipStyle}
          itemStyle={chartTooltipItemStyle}
          labelStyle={chartTooltipLabelStyle}
        />
        <Line
          dataKey="y"
          dot={false}
          isAnimationActive={false}
          name={element.props.yKey}
          stroke={color}
          strokeWidth={2}
          type="monotone"
        />
      </RechartsLineChart>
    </ChartFrame>
  );
};

interface PieChartProps {
  data: { [key: string]: unknown }[];
  height: number | null;
  nameKey: string;
  title: string | null;
  valueKey: string;
}

const PieChart: ComponentRenderer<PieChartProps> = ({ element }) => {
  const slices = (element.props.data ?? []).map((row) => ({
    name: String(row[element.props.nameKey] ?? ''),
    value: toNumber(row[element.props.valueKey]),
  }));

  return (
    <ChartFrame height={element.props.height} title={element.props.title}>
      <RechartsPieChart>
        <RechartsTooltip
          contentStyle={chartTooltipStyle}
          itemStyle={chartTooltipItemStyle}
          labelStyle={chartTooltipLabelStyle}
        />
        <Pie data={slices} dataKey="value" innerRadius="45%" isAnimationActive={false} nameKey="name">
          {slices.map((slice, index) => (
            <Cell fill={CHART_COLORS[index % CHART_COLORS.length]} key={`${slice.name}-${index.toString()}`} />
          ))}
        </Pie>
      </RechartsPieChart>
    </ChartFrame>
  );
};

// ---------------------------------------------------------------------------
// Mermaid
// ---------------------------------------------------------------------------

interface MermaidProps {
  chart: string;
  title: string | null;
}

const Mermaid: ComponentRenderer<MermaidProps> = ({ element }) => {
  const { chart, title } = element.props;
  const diagramId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const render = async (): Promise<void> => {
      try {
        const { default: mermaid } = await import('mermaid');
        const isDark = document.documentElement.classList.contains('dark');

        mermaid.initialize({ securityLevel: 'strict', startOnLoad: false, theme: isDark ? 'dark' : 'default' });

        const result = await mermaid.render(`fk-mermaid-${diagramId}`, chart);

        if (!isCancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (renderError) {
        if (!isCancelled) {
          setError(renderError instanceof Error ? renderError.message : 'Failed to render the diagram.');
        }
      }
    };

    void render();

    return () => {
      isCancelled = true;
    };
  }, [chart, diagramId]);

  return (
    <div className="fk:w-full fk:rounded-lg fk:border fk:border-border fk:bg-card fk:p-4">
      {title && <div className="fk:mb-2 fk:text-sm fk:font-medium">{title}</div>}
      {error ? (
        <pre className="fk:overflow-x-auto fk:whitespace-pre-wrap fk:text-xs fk:text-muted-foreground">{chart}</pre>
      ) : null}
      {!error && svg ? (
        <div className="fk:flex fk:justify-center fk:overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : null}
      {!error && !svg ? <SkeletonPrimitive className="fk:h-40 fk:w-full" /> : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Registry and spec rendering
// ---------------------------------------------------------------------------

const registry: ComponentRegistry = {
  Accordion,
  Alert,
  Badge: BadgeComponent,
  BarChart,
  Callout,
  Card,
  Grid,
  Heading,
  Image,
  LineChart,
  Link: LinkComponent,
  Mermaid,
  Metric,
  PieChart,
  Progress,
  Separator,
  Skeleton,
  Stack,
  TabContent,
  Table,
  Tabs,
  Text,
  Timeline,
};

const fallback: ComponentRenderer = ({ element }) => (
  <div className="fk:rounded-md fk:border fk:border-dashed fk:border-border fk:p-3 fk:text-sm fk:text-muted-foreground">
    Unsupported component: {element.type}
  </div>
);

function sanitizeSpec(spec: Spec): Spec | null {
  if (!spec.elements[spec.root]) {
    return null;
  }

  let hasChanged = false;
  const elements: Spec['elements'] = {};

  for (const elementKey of Object.keys(spec.elements)) {
    const element = spec.elements[elementKey];

    if (!element) {
      continue;
    }

    const elementChildren = element.children ?? [];
    const children = elementChildren.filter((childKey) => Boolean(spec.elements[childKey]));

    if (children.length !== elementChildren.length) {
      hasChanged = true;
    }

    elements[elementKey] = children.length === elementChildren.length ? element : { ...element, children };
  }

  if (!hasChanged) {
    return spec;
  }

  return { ...spec, elements };
}

interface SpecMessagePart {
  data?: unknown;
  text?: string;
  type: string;
}

const SPEC_DATA_PART_TYPE = 'data-spec';

function dedupeSpecParts(parts: SpecMessagePart[]): SpecMessagePart[] {
  const seenPatchLines = new Set<string>();
  const deduped: SpecMessagePart[] = [];

  for (const part of parts) {
    if (part.type !== SPEC_DATA_PART_TYPE) {
      continue;
    }

    const payload = part.data;

    if (payload && typeof payload === 'object' && 'type' in payload && payload.type === 'patch' && 'patch' in payload) {
      const line = JSON.stringify(payload.patch);

      if (seenPatchLines.has(line)) {
        continue;
      }

      seenPatchLines.add(line);
    }

    deduped.push(part);
  }

  return deduped;
}

export function RunSpecPart({ parts }: { parts: SpecMessagePart[] }): JSX.Element | null {
  const spec = useMemo(() => {
    const builtSpec = buildSpecFromParts(dedupeSpecParts(parts));

    return builtSpec ? sanitizeSpec(builtSpec) : null;
  }, [parts]);
  const stateKey = useMemo(() => JSON.stringify(spec?.state ?? {}), [spec]);

  if (!spec) {
    return null;
  }

  return (
    <StateProvider initialState={spec.state} key={stateKey}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer fallback={fallback} registry={registry} spec={spec} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

export type { SpecMessagePart };
