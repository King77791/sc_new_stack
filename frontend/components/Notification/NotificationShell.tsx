import type { ComponentPropsWithoutRef } from 'react';
import styles from './Notification.module.css';

/** Content composition is independent of semantic events and queue ownership. */
export function NotificationShell({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`${styles.shell} ${className}`}><div className={styles.content}>{children}</div></div>;
}
