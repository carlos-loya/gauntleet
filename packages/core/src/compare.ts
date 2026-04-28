import { deepEqual } from "./generate.js";

export interface AgreementResult {
  agreed: boolean;
  total: number;
  firstDisagreementIndex: number | null;
  /** Human-readable note suitable for storing in validation_notes. */
  note: string;
}

/**
 * Walks reference and validator outputs in parallel. Returns the first index
 * at which they disagree, plus a short note describing the result.
 */
export function compareOutputs(
  inputs: unknown[][],
  referenceOutputs: unknown[],
  validatorOutputs: unknown[]
): AgreementResult {
  const total = inputs.length;
  if (referenceOutputs.length !== total || validatorOutputs.length !== total) {
    return {
      agreed: false,
      total,
      firstDisagreementIndex: null,
      note:
        `output length mismatch: ${total} inputs, ` +
        `${referenceOutputs.length} reference outputs, ${validatorOutputs.length} validator outputs`,
    };
  }
  for (let i = 0; i < total; i++) {
    if (!deepEqual(referenceOutputs[i], validatorOutputs[i])) {
      return {
        agreed: false,
        total,
        firstDisagreementIndex: i,
        note: formatDisagreement(i, inputs[i], referenceOutputs[i], validatorOutputs[i]),
      };
    }
  }
  return {
    agreed: true,
    total,
    firstDisagreementIndex: null,
    note: `agreed on all ${total} inputs`,
  };
}

function formatDisagreement(
  index: number,
  input: unknown,
  reference: unknown,
  validator: unknown
): string {
  return [
    `disagreement on input ${index}:`,
    `  input: ${truncate(JSON.stringify(input))}`,
    `  reference: ${truncate(JSON.stringify(reference))}`,
    `  validator: ${truncate(JSON.stringify(validator))}`,
  ].join("\n");
}

function truncate(s: string, max = 200): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
