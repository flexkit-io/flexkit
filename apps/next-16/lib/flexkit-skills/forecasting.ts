import { defineSkill } from '@flexkit/studio/tools';

export const forecasting = defineSkill({
  name: 'Holt-Winters sales forecasting',
  description:
    'Use when forecasting seasonal sales or demand from historical collection data with a customer-provided Holt-Winters tool.',
  content: `# Holt-Winters sales forecasting

Use this procedure when an automation needs to forecast sales or product demand.

## Procedure

1. Read the relevant sales and product records and aggregate observations into evenly spaced time buckets.
2. Check that the series covers at least two complete seasonal cycles. Report insufficient history instead of extrapolating.
3. Identify the customer's Holt-Winters custom tool from its description. Do not guess a tool name or calculate the model yourself.
4. Call the tool separately for series with materially different seasonality. Pass chronological values, the bucket frequency, forecast horizon, and seasonal period expected by its schema.
5. Preserve product, location, currency, and unit identifiers when joining forecasts back to source records.
6. Flag negative, non-finite, or implausibly large outputs. Do not write forecasts to collections unless the automation explicitly requests a mutation.

## Result

Summarize the history window, seasonal period, forecast horizon, and tool parameters. Return forecasts with their bucket timestamps and source identifiers, and clearly label confidence limits when the tool provides them.`,
});
