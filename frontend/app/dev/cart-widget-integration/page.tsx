import { ProductCard } from '@/features/product/ProductCard/ProductCard';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { CartWidgetDiagnostics } from './CartWidgetDiagnostics';
import styles from './page.module.css';

export default function CartWidgetIntegrationPage() {
  const cards = [
    { id: 'a', data: productCardExamples[0].data },
    { id: 'b', data: productCardExamples[0].data },
    { id: 'pressed', data: productCardExamples[3].data },
    { id: 'ceramics', data: productCardExamples[4].data },
  ];
  return <>
    <div className={styles.cards}>{cards.map(card => <section key={card.id} data-card={card.id}>
      <h2>{card.id}</h2>
      <ProductCard data={card.data} presentation="responsive" />
    </section>)}</div>
    <CartWidgetDiagnostics />
    <div className={styles.scrollGuide}>Прокрутите к SiteFooter для проверки постепенного перекрытия fixed widget.</div>
  </>;
}
