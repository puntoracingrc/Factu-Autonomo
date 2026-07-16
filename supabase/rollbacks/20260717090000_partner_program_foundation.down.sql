-- Rollback manual y destructivo: aplicar solo tras exportar cualquier dato Partners.
drop table if exists public.partner_payouts;
drop table if exists public.partner_commission_entries;
drop table if exists public.partner_accounts;
