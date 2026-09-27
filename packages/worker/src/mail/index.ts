// E-mail: typed templates and sending through the outbox (Worker and CLI).
export { deliverEmail, retryDueEmails, sendViaOutbox, sender, type MailDeps } from './outbox';
export { renderEmail, type RenderedEmail } from './templates';
