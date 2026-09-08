-- =====================================================================
-- DOCUMENT_REQUIREMENT — the onboarding checklists, as configuration.
--
-- Source: frontend/app/lib/workforceStore.tsx (docRequirements()). These are
-- the real KATBOTZ checklists, not examples.
--
-- This table is the reason WORK_LOCATION carries region. The circulated
-- design put `region` here with nothing on the worker side to match it, so
-- the branching below could never have run. Region now comes from the
-- engagement's work location.
--
-- "Configuration is data": adding a country or a document is an INSERT.
-- No release, no code change.
-- =====================================================================

-- Contractor · US · independent
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('2c466059-411d-57bd-a597-2fe7f9c0d2e0','Contractor','US','independent','Government-issued ID (Driver’s License, Passport, or State ID)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('8b70f963-5a97-54e1-8643-3a908135ed5f','Contractor','US','independent','Social Security Number (SSN)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('259333fe-559d-542d-9150-8acfb6716642','Contractor','US','independent','Work Authorization (Green Card, Work Visa, etc.)',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('09741535-466a-52e6-971e-48167053ab30','Contractor','US','independent','Educational Certificates (college / university degrees)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('5089778f-6948-52de-9cf7-85e84bed6fd9','Contractor','US','independent','Previous Employment Verification (Offer / Experience Letters)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('3e0cce8f-65c6-5b9a-af43-db249a154d2b','Contractor','US','independent','Bank Account Details (Direct Deposit Form)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('8ab72766-702b-5e33-970f-17d85ed80d9e','Contractor','US','independent','Completed W-9 Form',true,'https://www.irs.gov/pub/irs-pdf/fw9.pdf');

-- Contractor · US · c2c
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('dd84f238-4a43-57a2-9d6a-3b0f0eb83d5e','Contractor','US','c2c','Employer Identification Number (EIN)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('a3c2bd2a-b41d-50a2-89bc-ae87383a62db','Contractor','US','c2c','State Business & Tax Registration',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('bc02f73a-db48-57fd-adf9-b876988c6ed5','Contractor','US','c2c','Business License, Incorporation Certificate, or Operating Agreement',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('fbe33d17-e859-5ce6-a28a-82b07c9e0f3b','Contractor','US','c2c','Bank Account Details of the Company',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('974ebd12-9998-58c2-8909-3c1f6da8b42b','Contractor','US','c2c','Candidate’s Government-issued ID (Driver’s License, Passport, or State ID)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('e8d7029c-8cff-5e25-82fc-15489aae02fd','Contractor','US','c2c','Candidate’s Educational Certificates and Work Experience Letters',true,NULL);

-- Contractor · India · independent
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('c1f57f16-0c70-55be-a45f-0f87d7854e88','Contractor','India','independent','Proof of Identity (Passport / Aadhaar / Driving License)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('4df589f1-4a41-5ee6-ade6-a39643c1ea81','Contractor','India','independent','Proof of Address (Passport / Aadhaar / Utility Bill)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('9a4420f6-abf2-57e7-8b19-23715e2ec92e','Contractor','India','independent','Educational Certificates (latest degree/diploma)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('1654246f-8c4d-5572-a537-279558395a13','Contractor','India','independent','Work Experience Letters',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('ab622755-56a5-5f1e-8716-c0314d2ff3a8','Contractor','India','independent','Relieving Letter from Previous Employer',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('3bfbf8da-edf7-5e8b-80d9-f86d2402c609','Contractor','India','independent','Bank Account Details (for payroll setup)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('a11d930a-19f8-5420-b257-695cb6a2bac9','Contractor','India','independent','Proof of Bank Account (Cancelled Cheque / Passbook / Statement)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('3a780680-1816-5b23-bdb0-a84caf543325','Contractor','India','independent','PAN Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('323cae2d-2c65-50a1-a4a5-ae0db69b9d23','Contractor','India','independent','Recent passport-sized photograph',true,NULL);

-- Contractor · India · c2c
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('84523c2a-1ad6-5a1d-963b-4cd000191f48','Contractor','India','c2c','Agency Registration Certificate (Incorporation / ROC)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('083a6bc5-356e-5244-beec-39298ece07b4','Contractor','India','c2c','GST Registration Certificate',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('34a4e720-0c21-5773-bf90-ffe836936150','Contractor','India','c2c','MSMED Registration Number',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('a45c519f-98f8-598e-98eb-c1bcb8aa13b6','Contractor','India','c2c','PAN Card of the Company',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('4d1e7dac-ae93-5ec9-bfab-0bb4b2c2ff1a','Contractor','India','c2c','Proof of Business Address (Utility bill / Rent agreement)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('5e9c4094-82bb-5c38-b51c-e181bc519fdf','Contractor','India','c2c','Bank Account Details of the Company',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('b9661cd8-a401-59ad-b6fb-ed638bfc4628','Contractor','India','c2c','Proof of Bank Account (Cancelled Cheque / Passbook / Statement)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('d794d6cd-c712-5517-b4c1-c3d4d3cd8332','Contractor','India','c2c','Labour License',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('963cf104-dec8-56f9-9f6f-0dbf9c01c288','Contractor','India','c2c','Professional Tax Registration',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('aacdbad7-f9df-506c-8cd3-e26a3cf97c50','Contractor','India','c2c','Compliance Certificates',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('e01a1f7c-cfa0-5ffe-a9b4-6904cf5cc5ed','Contractor','India','c2c','Candidate''s Aadhaar Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('5bd1fdff-f9dd-582b-8b23-962abd2ca80b','Contractor','India','c2c','Candidate''s Educational & Work Experience Certificates',true,NULL);

-- Employee · India
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('848108f2-8aa5-525b-b1c3-c0f7a08db9be','Employee','India',NULL,'PAN Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('eb344aea-eea0-550e-ad3e-3f530d842941','Employee','India',NULL,'Aadhaar',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('507d1035-d056-56a8-a279-a987b3826fe0','Employee','India',NULL,'Degree Certificate',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('d5211e82-4517-567a-9d14-081ae0b54e98','Employee','India',NULL,'10th Marksheet',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('e56ecb2d-d440-5906-95ab-56d7e0b75862','Employee','India',NULL,'12th Marksheet',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('8eaaecee-482b-5cae-ab6b-08e2d62a343e','Employee','India',NULL,'Bank Proof',true,NULL);

-- Employee · US
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('323f616c-afea-50ef-98af-097c0022fa87','Employee','US',NULL,'Government-issued ID (Driver’s License, Passport, or State ID)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('f5b70777-40df-5746-bfd6-95c33c1fc523','Employee','US',NULL,'Social Security Number (SSN)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('b4dd2db4-c558-58aa-b4a4-56050cba164c','Employee','US',NULL,'Form I-9 (Employment Eligibility Verification)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('79605a5f-8496-5400-a434-5bc747280403','Employee','US',NULL,'Completed W-4 Form',true,'https://www.irs.gov/pub/irs-pdf/fw4.pdf');
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('f4443ade-1fb3-5b97-a4e2-8413d7545f47','Employee','US',NULL,'Work Authorization (Green Card / Work Visa, if applicable)',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('1e4b5c8c-d65a-5cde-bd12-e796cdf828e1','Employee','US',NULL,'Educational Certificates (college / university degrees)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('8a1437be-9670-5006-9de2-f4640df7602b','Employee','US',NULL,'Previous Employment Verification (Offer / Experience Letters)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('b2164743-fbde-5d9e-a221-19cab450ea1d','Employee','US',NULL,'Bank Account Details (Direct Deposit Form)',true,NULL);

-- Intern · India
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('7c771bd1-280d-588b-b228-d503f66b8025','Intern','India',NULL,'Copy of Passport (first and last pages)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('552d6022-de06-543a-81d0-56fa1bcc9ce5','Intern','India',NULL,'PAN Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('f2603cd1-19b3-5576-bd3e-894120751c90','Intern','India',NULL,'Aadhaar Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('d0e3d9d8-2ca8-5f3f-a623-87934bb378b2','Intern','India',NULL,'Educational certificates (latest degree / semester marksheets)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('19dd07da-ba65-527d-86e8-ec7024ea29d6','Intern','India',NULL,'Updated resume',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('fc396e54-0851-509c-a8c2-b6de06b3431c','Intern','India',NULL,'Bank account details (for stipend processing)',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('28391f31-29ba-5691-83b8-af3cc283e191','Intern','India',NULL,'Signed internship contract',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('481a89ce-ee17-519d-9214-018cd260e2a7','Intern','India',NULL,'Emergency contact information form',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('4a8c1146-c112-5254-b0f7-83599896199f','Intern','India',NULL,'Address proof (utility bill / bank statement, not older than 3 months)',true,NULL);

-- Intern · US
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('b2af7f98-d81d-5415-9ba2-1da090683003','Intern','US',NULL,'Employment Authorization Document (EAD) Card',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('825f8658-6515-5685-8600-db1b28cd5fbc','Intern','US',NULL,'Updated Form I-20 (with DSO signature reflecting OPT authorization)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('dafb0cf8-622f-599f-809d-70e7cad1643c','Intern','US',NULL,'Passport copy (for identity verification)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('389bb497-3a91-5c8b-9c8e-1ebf4af72064','Intern','US',NULL,'Social Security Number (SSN)',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('c3c8b5e1-72e4-5d07-b786-0dc948aca400','Intern','US',NULL,'Form I-94 (Arrival / Departure Record)',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('ba1c2c0f-d71c-56ab-aba7-b846e5114024','Intern','US',NULL,'Copy of F-1 Visa',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('e22b4edf-5e7f-50d7-899b-e532c4f367d8','Intern','US',NULL,'Updated resume',true,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('6ccdb766-4607-5454-bf65-df5c10fe8307','Intern','US',NULL,'Signed internship contract',false,NULL);
INSERT INTO document_requirement (requirement_id,worker_type,region,contractor_mode,document_name,is_mandatory,reference_url) VALUES ('19aaa732-91c3-5c11-9212-bddb5535c79e','Intern','US',NULL,'Any additional documents requested by your DSO or university',false,NULL);
