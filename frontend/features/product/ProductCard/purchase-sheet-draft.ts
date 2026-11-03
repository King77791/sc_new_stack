/** Single-target UI draft only. Zero is never a Cart quantity. */
export type PurchaseSheetDraft = Readonly<{
  quantity: number;
  existingAtLoad: boolean;
  removalIntent: boolean;
}>;

export function loadPurchaseSheetDraft(quantity: number): PurchaseSheetDraft {
  return { quantity, existingAtLoad: quantity > 0, removalIntent: false };
}

export function editPurchaseSheetDraft(draft: PurchaseSheetDraft, delta: -1 | 1): PurchaseSheetDraft {
  if (delta === -1 && draft.quantity === 0) return draft;
  const quantity = draft.quantity + delta;
  return { ...draft, quantity, removalIntent: quantity === 0 && draft.existingAtLoad && delta === -1 };
}

export function sheetConfirmAction(quantity: number, removalIntent: boolean, targetExists: boolean) {
  if (quantity > 0) return targetExists ? 'set' : 'add';
  if (quantity === 0 && removalIntent) return targetExists ? 'remove' : 'absent';
  return 'none';
}
