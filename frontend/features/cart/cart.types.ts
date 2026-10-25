/** Frontend keys only. productKey currently comes from slug, not a backend ID. */
export type ConfigurationKey = Readonly<{ kind: 'selectable'; id: string }> | Readonly<{ kind: 'fixed' }>;

export type CartIdentity = Readonly<{
  productKey: string;
  configuration: ConfigurationKey;
}>;

export type CartPresentation = Readonly<{
  slug: string;
  title: string;
  configurationLabel?: string;
}>;

/** A missing dev quote must never leave a stale total for a different quantity. */
export type CartPricing = Readonly<{ status: 'ready'; displayLinePrice: string }>
  | Readonly<{ status: 'unavailable' }>;

export type CartItem = CartIdentity & Readonly<{
  /** Opaque local key, independent of a future server CartItem ID. */
  id: string;
  quantity: number;
  presentation: CartPresentation;
  pricing: CartPricing;
}>;

export type AddItemInput = CartIdentity & Readonly<{
  quantity: number;
  presentation: CartPresentation;
}>;

export type SuccessfulAdd = Readonly<{
  item: CartItem;
  addedQuantity: number;
}>;

export type MutationResult<T> = Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; reason: 'invalid-quantity' | 'invalid-identity' | 'not-found' | 'pricing-failed' }>;

/** Explicit local quote boundary. No price, stock or discount rules live in Cart. */
export type ResolveCartPricing = (item: Omit<CartItem, 'pricing'>) => CartPricing;

export type CartPublicInterface = Readonly<{
  items: readonly CartItem[];
  itemCount: number;
  hasItems: boolean;
  getItem: (productKey: string, configuration: ConfigurationKey) => CartItem | undefined;
  getQuantity: (productKey: string, configuration: ConfigurationKey) => number;
  addItem: (input: AddItemInput) => Promise<MutationResult<SuccessfulAdd>>;
  setItemQuantity: (itemId: string, quantity: number) => Promise<MutationResult<CartItem>>;
  removeItem: (itemId: string) => Promise<MutationResult<{ itemId: string }>>;
}>;
