/** Presentation inputs only: prepared Cart values and a separately supplied Product availability status. */
export type CartWidgetItemData = Readonly<{
  /** Opaque CartItem identity, including its Purchase Configuration. */
  id: string;
  /** Stable Product navigation identifier; independent of title and CartItem ID. */
  slug: string;
  title: string;
  /** Prepared total for this entire CartItem, already accounting for quantity. */
  displayLinePrice: string;
  /** Configuration of ONE unit; never multiplied by quantity. */
  configurationLabel?: string;
  quantity: number;
  /** From the current product-input snapshot, independently of Cart quantity/pricing. */
  unavailable?: boolean;
}>;

export type CartWidgetProps = Readonly<{
  items: readonly CartWidgetItemData[];
  onRemoveItem: (itemId: string) => void | Promise<boolean | void>;
}>;
