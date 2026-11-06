import { applicationProductSnapshot } from './product-input.fixtures';
import { prepareProductInputs } from './product-input.validation';
import { productInputCards } from './product-input.presentation';
import { productInputCartPricing } from './product-input.cart-pricing';
import { productInputTransferTarget } from './product-input.transfer';
import { productInputWidgetAvailability } from './product-input.availability';
import { deepFreeze } from './product-input.snapshot';

const views = prepareProductInputs(applicationProductSnapshot);
/** Single-generation immutable application composition; contains no Cart/quantity state. */
export const applicationProductInputs = deepFreeze({
  views,
  cards: productInputCards(views),
  resolvePricing: productInputCartPricing(views),
  resolveTransferTarget: productInputTransferTarget(views),
  widgetAvailability: productInputWidgetAvailability(views),
});
