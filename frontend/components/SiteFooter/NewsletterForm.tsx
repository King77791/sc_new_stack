'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import styles from './NewsletterForm.module.css';

export function NewsletterForm() {
  const id = useId();
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem('newsletter-email') as HTMLInputElement;
    const trimmed = email.value.trim();
    const separator = trimmed.lastIndexOf('@');
    // Preserve the local part; only the domain is case-insensitive.
    email.value = separator < 0 ? trimmed : `${trimmed.slice(0, separator)}${trimmed.slice(separator).toLowerCase()}`;
    setNotice('');
    // Future domain rules belong here, and must also be validated by the backend.
    if (!form.reportValidity()) return;
    // No subscription API exists yet. Never send or claim to persist the email.
    setNotice('Подписка временно недоступна. Попробуйте позже.');
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate onChange={() => setNotice('')}>
      <label htmlFor={`${id}-email`} className={styles.heading}>Следите за акциями и новостями</label>
      <div className={styles.field}>
        <input id={`${id}-email`} name="newsletter-email" type="email" required autoComplete="email"
          placeholder="E-mail почта" aria-label="Электронная почта для подписки" aria-describedby={notice ? `${id}-notice` : undefined} />
        <button type="submit" disabled={!ready} aria-label="Подписаться на акции и новости">
          <Image src="/icons/newsletter-submit.svg" width={28} height={28} alt="" />
        </button>
      </div>
      <div className={styles.consent}>
        <input id={`${id}-consent`} name="newsletter-consent" type="checkbox" required />
        <label htmlFor={`${id}-consent`}>
          Я согласен с{' '}
          <Link href="/private_policy">политикой обработки персональных данных</Link>
        </label>
      </div>
      <p id={`${id}-notice`} role="status" className={styles.notice} hidden={!notice}>{notice}</p>
    </form>
  );
}
