-- =====================================================================
-- NOT APPLIED BY DEFAULT — needs a business owner's confirmation first.
--
-- The blueprint states that VISA_RECORD.visa_type is a CHECK-constrained
-- controlled vocabulary, and that leave categories are configuration.
-- Neither list is enumerated anywhere in the FSD, so the values are NOT
-- invented here. Confirm the lists, then uncomment and run this file.
--
-- Until then both columns are free text, which is the honest state: the
-- schema does not pretend to know a vocabulary nobody has defined.
-- =====================================================================

-- ALTER TABLE visa_record ADD CONSTRAINT ck_visa_type
--     CHECK (visa_type IN (  /* confirm with HR / Legal */  ));

-- ALTER TABLE work_authorization ADD CONSTRAINT ck_auth_type
--     CHECK (auth_type IN (  /* confirm with HR / Legal */  ));

-- Leave categories are configuration ("Configuration is data"), so the
-- preferred fix is a LEAVE_CATEGORY reference table rather than a CHECK.
-- That is a schema addition and therefore a decision, not a default.
