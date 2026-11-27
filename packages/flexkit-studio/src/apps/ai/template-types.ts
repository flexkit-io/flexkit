import type { AutomationMutationPolicy, AutomationNotifyRule, AutomationTriggerType, SkillLoadMode } from './types';

/** What a template makes: an automation, or a skill scaffold the agent fills in with the user. */
export type TemplateKind = 'automation' | 'skill';

export interface TemplateHowItWorksRow {
  label: string;
  text: string;
}

export interface TemplatePluginRequirement {
  /** The catalog plugin id, the same as `MarketplacePlugin.id`. */
  id: string;
  reason: string;
  required: boolean;
}

export interface TemplateDataRequirement {
  description: string;
  entityHint?: string;
  fieldHint?: string;
  key: string;
  required: boolean;
  type: 'any' | 'boolean' | 'date' | 'number' | 'reference' | 'string';
}

export interface TemplateParameter {
  default?: boolean | number | string | null;
  description?: string;
  key: string;
  label: string;
  options?: string[];
  type: 'boolean' | 'channel' | 'cron' | 'number' | 'select' | 'string' | 'timezone';
}

export interface TemplateAutomationDefaults {
  mutationPolicy: AutomationMutationPolicy;
  notifyRule: AutomationNotifyRule;
  /** Names of skill templates that make this automation's output better. */
  recommendedSkills: string[];
  /** The trigger type plus its defaults (cron, timezone, events, entityHint, job, outcome, automationId, intervalMinutes). */
  trigger: { [key: string]: unknown; type: AutomationTriggerType };
}

/** A template as the catalog lists it. */
export interface TemplateSummary {
  /** Null for skill templates. */
  automation?: TemplateAutomationDefaults | null;
  category: string;
  data: TemplateDataRequirement[];
  description: string;
  displayName: string;
  howItWorks: TemplateHowItWorksRow[];
  keywords?: string[];
  kind: TemplateKind;
  name: string;
  parameters: TemplateParameter[];
  plugins: TemplatePluginRequirement[];
  /** Null for automation templates. */
  skill?: { loadMode: SkillLoadMode } | null;
  /** Automations and skills in this project made from this template. */
  usedBy: number;
  version: string;
}

export interface TemplateCatalog {
  catalogSha: string | null;
  templates: TemplateSummary[];
}

export interface TemplateDetail {
  /** A sample of what the template produces, in Markdown. */
  example: string | null;
  /** The automation's instructions, or the skill scaffold. */
  instructions: string;
  setup: string | null;
  template: TemplateSummary;
}

/** The template an automation or skill was made from. Absent from older platforms. */
export interface TemplateProvenance {
  name: string;
  version: string;
}
