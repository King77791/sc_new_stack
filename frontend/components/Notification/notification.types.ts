import type { CartItem, SuccessfulAdd } from '@/features/cart/cart.types';

export type NotificationEvent =
  | Readonly<{ type: 'cart.added'; payload: {
      itemId: CartItem['id'];
      productKey: CartItem['productKey'];
      title: string;
      configurationLabel?: string;
      addedQuantity: SuccessfulAdd['addedQuantity'];
    } }>
  | Readonly<{ type: 'favorite.added'; payload: { productKey: string; title: string } }>;

export function cartAddedEvent({ item, addedQuantity }: SuccessfulAdd): NotificationEvent {
  return { type: 'cart.added', payload: {
    itemId: item.id, productKey: item.productKey, title: item.presentation.title,
    configurationLabel: item.presentation.configurationLabel, addedQuantity,
  } };
}

export function notificationMessage(event: NotificationEvent): string {
  switch (event.type) {
    case 'cart.added': return 'Товар добавлен в корзину';
    case 'favorite.added': return 'Товар добавлен в избранное';
  }
}
