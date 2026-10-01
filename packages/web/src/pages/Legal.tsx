// Mandatory pages (F14): imprint, terms, privacy and contact as clearly
// marked placeholders with all required sections (operator data from
// product.config.yaml; final texts after BG-02), and "So funktioniert's"
// with data source, intermediary role, payment, ranking and use of AI.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { productConfig } from '@reiseplaner/config';
import { AiLabel, Alert, Card, Heading, Text } from '@reiseplaner/ui';
import { RECENT_MAX } from '../features/search/recent';
import { de } from '../i18n/de';
import { useMeta } from '../lib/meta';

const t = de.legal;
const op = productConfig.operator;

function Page({ title, placeholder = true, children }: { title: string; placeholder?: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6" data-testid="legal-page">
      <Heading level={1}>{title}</Heading>
      {placeholder ? (
        <div data-testid="legal-placeholder">
          <Alert tone="warning">{t.placeholder}</Alert>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <Heading level={2}>{title}</Heading>
      <div className="space-y-2 text-sm/6 text-zinc-700">{children}</div>
    </section>
  );
}

export function Imprint() {
  return (
    <Page title={t.imprintTitle}>
      <Section title={t.imprintProvider}>
        <p>
          {op.company}
          {op.address_lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </Section>
      <Section title={t.imprintRepresented}>
        <p>{op.represented_by}</p>
      </Section>
      <Section title={t.imprintContact}>
        <p>{op.contact_email}</p>
      </Section>
      <Section title={t.imprintRegister}>
        <p>{op.register_entry}</p>
      </Section>
      <Section title={t.imprintVat}>
        <p>{op.vat_id}</p>
      </Section>
      <Section title={t.imprintResponsible}>
        <p>{op.represented_by}</p>
      </Section>
      <Section title={t.imprintRole}>
        <p>{op.role_statement}</p>
      </Section>
      <Section title={t.imprintDispute}>
        <p>{t.imprintDisputeText}</p>
      </Section>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title={t.termsTitle}>
      {t.terms.map(([title, text]) => (
        <Section key={title} title={title}>
          <p>{text}</p>
        </Section>
      ))}
    </Page>
  );
}

export function Privacy() {
  const retention = productConfig.compliance.retention;
  return (
    <Page title={t.privacyTitle}>
      <Section title={t.privacyController}>
        <p>
          {op.company}, {op.address_lines.join(', ')}, {op.contact_email}
        </p>
      </Section>
      <Section title={t.privacyDataTitle}>
        <dl className="space-y-3">
          {t.privacyData(retention.searches_days, retention.ip_hash_days, retention.guest_data_days_after_checkout).map(([term, text]) => (
            <div key={term}>
              <dt className="font-semibold text-zinc-900">{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title={t.privacyProcessorsTitle}>
        <p>{t.privacyProcessors}</p>
      </Section>
      <Section title={t.privacyCookiesTitle}>
        <p>{t.privacyCookies(RECENT_MAX, productConfig.compliance.retention.searches_days)}</p>
      </Section>
      <Section title={t.privacyRightsTitle}>
        <p>{t.privacyRights}</p>
      </Section>
    </Page>
  );
}

export function Contact() {
  return (
    <Page title={t.contactTitle} placeholder={false}>
      <Card className="space-y-3">
        <Text data-testid="contact-email">{t.contactText(productConfig.support.email, productConfig.support.response_time_hours)}</Text>
        <Text className="text-sm">{t.contactBooking}</Text>
      </Card>
    </Page>
  );
}

export function HowItWorks() {
  const meta = useMeta();
  const labels = meta.status === 'ready' ? Object.values(meta.meta.ai_labels).filter(Boolean) : [];
  return (
    <Page title={t.howTitle} placeholder={false}>
      <Text>{t.howLead(productConfig.name)}</Text>
      {t.how.map(([title, text]) => (
        <Card key={title} className="space-y-2">
          <Heading level={2}>{title}</Heading>
          <Text className="text-sm/6">{text}</Text>
          {title === t.how[3]?.[0] ? (
            <Link to="/ranking" className="text-sm font-semibold text-brand-700 hover:underline">
              {t.howRankingLink}
            </Link>
          ) : null}
          {title === t.how[4]?.[0] && labels.length > 0 ? (
            <div className="space-y-2">
              <Text className="text-sm">{t.howAiLabels}</Text>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <AiLabel key={label} text={label} />
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </Page>
  );
}
