import type { JSX } from 'react';
import {
  Bell,
  BookOpen,
  BookText,
  Calculator,
  CalendarClock,
  ChartColumn,
  ClipboardCheck,
  Database,
  EyeOff,
  FileText,
  Globe,
  Hourglass,
  Inbox,
  Languages,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  PackageMinus,
  PenLine,
  Receipt,
  RefreshCw,
  Repeat,
  Scale,
  ScrollText,
  SearchCheck,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sigma,
  Siren,
  Smile,
  Sparkles,
  Star,
  Tag,
  Truck,
  Users,
  Webhook,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { TemplateSummary } from './template-types';

/**
 * The icons a template may name, keyed by their Lucide names. The catalog's template schema
 * (flexkit-io/plugins, schemas/template.schema.json) allows exactly these: add an icon here first.
 */
const TEMPLATE_ICONS: { [name: string]: LucideIcon } = {
  bell: Bell,
  'book-open': BookOpen,
  calculator: Calculator,
  'calendar-clock': CalendarClock,
  'chart-column': ChartColumn,
  'clipboard-check': ClipboardCheck,
  database: Database,
  'eye-off': EyeOff,
  'file-text': FileText,
  globe: Globe,
  hourglass: Hourglass,
  inbox: Inbox,
  languages: Languages,
  'list-checks': ListChecks,
  mail: Mail,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  newspaper: Newspaper,
  'package-minus': PackageMinus,
  'pen-line': PenLine,
  receipt: Receipt,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  scale: Scale,
  'scroll-text': ScrollText,
  'search-check': SearchCheck,
  send: Send,
  'shield-check': ShieldCheck,
  'shopping-cart': ShoppingCart,
  sigma: Sigma,
  siren: Siren,
  smile: Smile,
  sparkles: Sparkles,
  star: Star,
  tag: Tag,
  truck: Truck,
  users: Users,
  webhook: Webhook,
  zap: Zap,
};

/** The palette, as whole class names so Tailwind finds them: a pale tint and a deeper icon, lighter at night. */
const TEMPLATE_COLORS = {
  violet: 'fk:bg-violet-100 fk:text-violet-600 fk:dark:bg-violet-500/16 fk:dark:text-violet-400',
  blue: 'fk:bg-blue-100 fk:text-blue-600 fk:dark:bg-blue-500/16 fk:dark:text-blue-400',
  sky: 'fk:bg-sky-100 fk:text-sky-600 fk:dark:bg-sky-500/16 fk:dark:text-sky-400',
  teal: 'fk:bg-teal-100 fk:text-teal-600 fk:dark:bg-teal-500/16 fk:dark:text-teal-400',
  emerald: 'fk:bg-emerald-100 fk:text-emerald-600 fk:dark:bg-emerald-500/16 fk:dark:text-emerald-400',
  amber: 'fk:bg-amber-100 fk:text-amber-600 fk:dark:bg-amber-500/16 fk:dark:text-amber-400',
  orange: 'fk:bg-orange-100 fk:text-orange-600 fk:dark:bg-orange-500/16 fk:dark:text-orange-400',
  rose: 'fk:bg-rose-100 fk:text-rose-600 fk:dark:bg-rose-500/16 fk:dark:text-rose-400',
} as const;

export type TemplateColor = keyof typeof TEMPLATE_COLORS;

const COLOR_NAMES = Object.keys(TEMPLATE_COLORS) as TemplateColor[];

function isTemplateColor(name: string | null | undefined): name is TemplateColor {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATE_COLORS, name);
}

/** The template's color, or one picked from its name so an older catalog still gets a stable one. */
export function templateColor(template: Pick<TemplateSummary, 'color' | 'name'>): TemplateColor {
  if (isTemplateColor(template.color)) {
    return template.color;
  }

  let hash = 0;

  for (const char of template.name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return COLOR_NAMES[hash % COLOR_NAMES.length]!;
}

/** The template's icon, or the kind's when it names none Studio has. */
export function templateIcon(template: Pick<TemplateSummary, 'icon' | 'kind'>): LucideIcon {
  const icon =
    template.icon && Object.prototype.hasOwnProperty.call(TEMPLATE_ICONS, template.icon)
      ? TEMPLATE_ICONS[template.icon]
      : undefined;

  return icon ?? (template.kind === 'skill' ? BookText : Zap);
}

/** A template's avatar: its icon on a tile of its color. Size it with `className` (default 40px). */
export function TemplateAvatar({
  className = 'fk:size-10',
  template,
}: {
  className?: string;
  template: Pick<TemplateSummary, 'color' | 'icon' | 'kind' | 'name'>;
}): JSX.Element {
  const Icon = templateIcon(template);

  return (
    <span
      aria-hidden
      className={`fk:flex fk:shrink-0 fk:items-center fk:justify-center fk:rounded-lg fk:corner-squircle ${TEMPLATE_COLORS[templateColor(template)]} ${className}`}
    >
      <Icon className="fk:size-1/2" strokeWidth={1.5} />
    </span>
  );
}
