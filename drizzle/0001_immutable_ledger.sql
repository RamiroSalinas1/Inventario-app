-- History is append-only. Stock services must insert movements and update balances
-- atomically in a transaction. Corrections are new compensating movements.
CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Registro inmutable: inserte un movimiento compensatorio';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
