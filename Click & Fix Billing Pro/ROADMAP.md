# Click & Fix Billing Pro — Master Roadmap

## Operating model

- Offline-first web application hosted as a static site.
- IndexedDB is the primary working database on each device.
- Google Drive is an automatic encrypted backup/sync layer, not a transactional database.
- Manual JSON export/import remains available for recovery.
- Do not edit the same data from two devices at the same time until a conflict-resolution workflow is built.

## Product scope

1. Customers, products, inventory, invoices, payments, and company settings.
2. Professional A4 GST/non-GST invoice, automatic-but-editable invoice numbers, fixed stamp/signature assets, print/PDF export.
3. Stock movement and low-stock controls; partial/full payment history with Cash, UPI, Card, Bank, Cheque, and Other modes.
4. Manual email payment reminders through Brevo and manual WhatsApp sharing.

## Delivery sequence

### Sprint 1 — Foundation

- SPA shell, responsive layout, IndexedDB schema, routing, auto IDs, audit log, and sync skeleton.

### Sprint 2 — Masters

- Customer and product CRUD, search, profile/history foundations.

### Sprint 3 — Inventory and invoices

- Stock movements, invoice editor, GST/non-GST calculations, invoice numbering, stock deduction.

### Sprint 4 — Payments and documents

- Payment entries/history, outstanding calculation, print-ready A4 invoice and PDF export.

### Sprint 5 — Resilience and sharing

- JSON backup/restore, Google Drive sign-in/sync, manual email reminders and WhatsApp sharing.

### Later releases

- Reports, Flutter Windows desktop software with licensing, Android app, and multi-device conflict handling.
