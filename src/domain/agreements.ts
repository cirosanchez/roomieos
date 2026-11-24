import type { Agreement, AppState } from "./types";
import { agreementDraftSchema, validateState } from "./validation";

export type AgreementDraft = Pick<Agreement, "title" | "details">;
export type AgreementAction =
  | { type: "add-agreement"; agreement: AgreementDraft }
  | { type: "edit-agreement"; id: string; agreement: AgreementDraft }
  | { type: "delete-agreement"; id: string };

export function applyAgreementAction(
  state: AppState,
  action: AgreementAction,
  makeId: () => string,
): AppState {
  const existing =
    action.type === "add-agreement"
      ? undefined
      : state.agreements.find((agreement) => agreement.id === action.id);
  if (action.type !== "add-agreement" && !existing)
    throw new Error(
      "This agreement could not be found. Reload the household and try again.",
    );
  if (action.type === "delete-agreement")
    return validateState({
      ...state,
      agreements: state.agreements.filter(
        (agreement) => agreement.id !== existing!.id,
      ),
    });
  const draft = agreementDraftSchema.parse({
    ...action.agreement,
    title: action.agreement.title.trim(),
  });
  const updated = { ...draft, id: existing?.id ?? makeId() };
  return validateState({
    ...state,
    agreements: existing
      ? state.agreements.map((agreement) =>
          agreement.id === existing.id ? updated : agreement,
        )
      : [...state.agreements, updated],
  });
}
