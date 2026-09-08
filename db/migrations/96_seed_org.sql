-- =====================================================================
-- REAL seed: the KATBOTZ org as recorded in the Org Matrix July 2026.
-- Source: frontend/app/lib/orgSource.ts (already normalized from the
-- HR Process Document). Nothing here is invented.
--
-- NOT seeded, deliberately: EMPLOYMENT. The org matrix records no join
-- dates and no worker types, and both are NOT NULL. Inventing them would
-- put fiction in the system of record. Engagements arrive via onboarding.
-- =====================================================================

-- 12 departments under the root (the root itself is in 90_seed_root.sql).
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('f60ed9be-bdb7-5a42-9678-a5e3a3ba4fb5','HR','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('081ac190-f2f7-5530-96ad-957e8b86695b','Recruiting','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('89408a1b-ecf4-5fda-9cec-24d4aa94b524','Marketing','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('ee749bdf-7d0e-5a42-9425-045ca617600f','Business Development','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('73f2532e-8d8a-5de7-acc3-ccf76381b428','Procurement','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('0d032501-c121-5831-812a-639b4df42e9f','Finance','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('7a18419d-e63c-5bec-bd98-2afb2db91ae7','Innovation','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('19c6eee3-faf7-5c15-a015-46492724781a','Legal','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('b8986700-fd2a-50df-a581-ea4f1e68d0a6','Alliances','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('80e0ee54-9574-5997-8e95-5c5c35b1b6b1','Internship','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('935f2b42-0924-5b74-bd06-27b502e42f85','IT / System Admin','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;
INSERT INTO department (department_id,name,parent_department_id,is_root,is_active) VALUES ('020e9e92-39b5-59fd-a7eb-88d77b26afbd','Operations','00000000-0000-0000-0000-000000000001',false,true) ON CONFLICT DO NOTHING;

-- 34 people. One row per human, as the design requires.
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('64a9f94a-ae68-5985-a3a5-bfd662053682','Ashish','Katyayan','Ashish Katyayan') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('c8c5c316-35b5-5a3f-9ec7-1ddacf12e61e','Priyanka','Katyayan','Priyanka Katyayan') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('cf455ca9-015a-5889-8e49-8e2aeba23610','Adesh','Katyayan','Adesh Katyayan') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('e831b106-e3fd-5689-862c-e134db34e32f','Akshat',NULL,'Akshat') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('961f1338-0fad-5210-a208-5271c092d701','Vrinda',NULL,'Vrinda') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('9fb442ca-89b8-5884-a1f8-b0636828f3eb','Karthik',NULL,'Karthik') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('2fcdc382-0180-5524-b3aa-cdbf80fca7ee','Aparna','Sarishty','Aparna Sarishty') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('032753f8-4ff7-5efd-8da5-a570b6449c81','Ananya',NULL,'Ananya') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('706c5551-fd4a-5da7-a3e3-258842f3a16d','Puja',NULL,'Puja') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('90e51171-fba5-5bea-8a9a-ae98285e2868','Sarishty','Varsha','Sarishty Varsha') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('ead28047-f85b-5e1b-b1af-3fd05676dc54','Ayushi',NULL,'Ayushi') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('1ff2899c-743b-5691-acd7-e042c4e98094','Rinchen',NULL,'Rinchen') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('e05a1aef-3a28-5797-83b4-404d86bdac80','Shrutkirti',NULL,'Shrutkirti') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('33738659-d86a-5971-9864-55ed1101fc1c','Bhupender','Pruthi','Bhupender Pruthi') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('1afbc141-cb0c-5d21-87d9-230c7f33f94c','Anchal','Verma','Anchal Verma') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('307984fe-4262-5699-be07-51c2ca790fca','Sachin','Doger','Sachin Doger') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('8257687b-9fb5-5f3e-980e-be5494bdb3df','Gourev',NULL,'Gourev') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('73311a8d-34e6-582e-bb28-233030cd97f4','Rishi',NULL,'Rishi') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('f240e294-f482-5ff6-a3b2-1b2d2129b3e3','Naisha',NULL,'Naisha') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('0d567b02-4ecc-5348-b940-ac91bb28e034','Anoop',NULL,'Anoop') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('5d020770-03a2-58fd-ada7-ea869d83e55e','Diya','Thakur','Diya Thakur') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('1b86a43c-4941-5c3f-9248-8f8015ae9ef5','Ashish',NULL,'Ashish') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('16524113-11f1-5abe-a4de-a485e7fc3a23','Nikhil','Rao','Nikhil Rao') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('f2c5f1a4-f651-5f5a-b575-e0b37e4cab48','Keya',NULL,'Keya') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('0dea9af7-9f16-5ead-ac1a-391a03ac00c4','Saranya',NULL,'Saranya') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('4ea0db10-07d0-59d9-bca5-e04829a26e67','Shardul',NULL,'Shardul') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('07436950-e71c-557a-a8ed-8144590914ae','Koushika',NULL,'Koushika') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('baa0fbd3-82a0-515d-8ab1-3614e10dd9b0','Khusbhu',NULL,'Khusbhu') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('e5d705ae-f5a5-5684-867c-a1b2289a2e5b','Biondi',NULL,'Biondi') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('0d3e20e3-1b5a-5912-b463-9c1de2fb458c','Sateesh',NULL,'Sateesh') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('6bf4aaf8-c968-5de6-8cb7-35de95453d0c','Vishal',NULL,'Vishal') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('50971d4e-e7d2-507a-89da-8465c0a805e6','Rakesh',NULL,'Rakesh') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('2ae44dfe-5a1f-5e15-a38c-09da5d7f8233','Tuski',NULL,'Tuski') ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name,preferred_name) VALUES ('09869d40-f07d-537d-8dc9-e9b77d19a3a1','Staffi',NULL,'Staffi') ON CONFLICT DO NOTHING;

-- 50 seats. A seat exists whether or not somebody holds it;
-- the unfilled ones below are genuine open positions in the matrix.
-- base_tier is PROPOSED from the title and needs HR confirmation.
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('9f8baefd-6c29-545e-b01f-e6c125d5a76f','CEO & Founder','00000000-0000-0000-0000-000000000001','founder',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('ba10b9d2-4a48-55bf-b3e6-ccddcfffe100','Co-Founder / COO','00000000-0000-0000-0000-000000000001','employee',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('536debdf-fa36-5c00-8c2b-f00d5b05f05d','Director India','00000000-0000-0000-0000-000000000001','employee',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('89236eec-a7bb-56fa-af94-68a43ca79365','Chief of Staff','00000000-0000-0000-0000-000000000001','employee',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('dfcd5bbb-fda7-5f85-af72-a7462da3c209','Chief of Staff','00000000-0000-0000-0000-000000000001','employee',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('485f7f5a-58b1-5781-b57a-aafcb0da2861','Chief of Staff','00000000-0000-0000-0000-000000000001','employee',0,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('601a3586-3221-5374-b276-0c7377cf611f','Global HR Lead','f60ed9be-bdb7-5a42-9678-a5e3a3ba4fb5','hr_admin',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('33d2aa4f-5fdb-59dc-9107-3b525a32f7b7','Operations Lead','f60ed9be-bdb7-5a42-9678-a5e3a3ba4fb5','hr_admin',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('91ce802d-fa9d-5763-9e0f-f90000132ee9','Operations Manager','f60ed9be-bdb7-5a42-9678-a5e3a3ba4fb5','hr_admin',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('b16e64e3-a942-598a-9f0c-e451a5a94ce7','Intern','f60ed9be-bdb7-5a42-9678-a5e3a3ba4fb5','intern',4,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('02bbf2fc-e8de-5916-bcf8-5a5ccaaded8c','Recruitment Lead','081ac190-f2f7-5530-96ad-957e8b86695b','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('ab152990-cfbe-596a-9018-9129e39e6cb3','Recruitment Manager','081ac190-f2f7-5530-96ad-957e8b86695b','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('382c030c-70ac-5010-bfb3-d764870abfab','Global Marketing & BD Lead','89408a1b-ecf4-5fda-9cec-24d4aa94b524','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('23205adb-38e0-5119-84ff-f46b354a5888','Marketing Lead','89408a1b-ecf4-5fda-9cec-24d4aa94b524','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('8a8b57ea-827e-5ee4-8289-9f69cdf7fdfa','Marketing Manager','89408a1b-ecf4-5fda-9cec-24d4aa94b524','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('d7b6579e-0b59-55c3-8a23-2689c24917ef','Business Marketing Analyst','89408a1b-ecf4-5fda-9cec-24d4aa94b524','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('ea290373-4aa7-53d0-9d11-1a0a3a99b734','Sales Lead','ee749bdf-7d0e-5a42-9425-045ca617600f','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('864c5be8-c73a-537e-87d3-d1c5a86c3202','Business Analyst','ee749bdf-7d0e-5a42-9425-045ca617600f','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('24ff8799-bb12-5acb-9b64-0908f36267c8','Business Development','ee749bdf-7d0e-5a42-9425-045ca617600f','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('04893e9c-ab78-5c4f-a531-f6342a0f851d','Fractional CFO (Global)','0d032501-c121-5831-812a-639b4df42e9f','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('02d67f77-54c6-5959-9194-52ac020c29c6','Finance Operations Lead (US)','0d032501-c121-5831-812a-639b4df42e9f','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('47875693-a9fd-5c93-b37e-99a2c35ba948','Chartered Accountant (India)','0d032501-c121-5831-812a-639b4df42e9f','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('a516cddb-4517-5b42-8286-45c79b2679b8','Company Secretary (India)','0d032501-c121-5831-812a-639b4df42e9f','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('6a9f326a-46ea-50b2-bf00-ce5fd394c7c5','Finance Manager','0d032501-c121-5831-812a-639b4df42e9f','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('a1d8f1ce-8d43-5e70-a834-8b689b4e9555','Jr Financial Analyst','0d032501-c121-5831-812a-639b4df42e9f','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('cbe8a564-ae81-574e-8bc7-f8f371babb1b','Accountant','0d032501-c121-5831-812a-639b4df42e9f','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('b9fd8573-bbed-5fbe-a701-2a532e20f18d','Junior Accountant','0d032501-c121-5831-812a-639b4df42e9f','intern',4,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('0779a506-4c6a-5f95-b494-cf39e52967ec','Global Tech Innovation Lead','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('00ff98b1-226a-512c-84cd-2856cc9b2a31','CFO Lead','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('4f552ce0-dcc6-58a3-be90-90c9a9e4e53c','Website Lead','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('b12ecb5f-c031-5084-afdb-e99b7920ec15','Databricks / SAP BDC Lead','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('c43b704a-2edd-533b-9818-3b9c7f913aa7','CWI / AI-ML','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('39d2a190-3594-5f6f-8596-ef1106ef92d9','GCP Lead Architect','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('20bd32a9-4c4f-53c9-b21a-548c16b86b7f','Finance Analyst','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('f27561d7-cd23-5a38-a93d-5a14f27ef56e','Full Stack Developer','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('d3f55805-1f91-520c-92c6-9b8c085af3f0','ML Engineer','7a18419d-e63c-5bec-bd98-2afb2db91ae7','employee',3,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('5fa3ad3c-9ace-5004-b6eb-0ac4f77229f1','HR Legal & Compliance Lead','19c6eee3-faf7-5c15-a015-46492724781a','hr_admin',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('4f37cc49-cea7-53bf-92e8-a789254712bb','Legal Analysts','19c6eee3-faf7-5c15-a015-46492724781a','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('09c34c67-b07b-57cb-a1bc-fb14efa7ed30','SAP Partnership Lead','b8986700-fd2a-50df-a581-ea4f1e68d0a6','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('ed163847-1277-5af9-b188-d69a2bca485e','Talent & Education Lead','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',1,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('e508e301-1296-5002-b06b-28e9c1219632','SAP Curriculum Lead','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('11be1a6b-10a8-5a97-b699-4d5733f0bba1','FICO SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('36c4158f-a985-5acf-ae9c-9344df4c3aaf','OTC SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('eb9ab305-083a-5327-b322-170b4b718ec4','PM SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('5d807ae8-fbf8-5e24-a327-e1e70709c3b7','QM SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('643297d1-c529-5f28-a3b4-c69a233e4824','ABAP SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('6a66b662-1b20-5ea4-ad2e-811a30c9806b','Project Mgmt SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('b40e5cd6-9c8c-56a9-b17e-1631a46ec9c1','Project Mgmt SME','80e0ee54-9574-5997-8e95-5c5c35b1b6b1','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('8ea2ec56-06f3-5c8a-b8ff-8b30cee15421','IT Manager','935f2b42-0924-5b74-bd06-27b502e42f85','employee',2,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,level,is_active) VALUES ('d0beb058-1f28-50aa-a6d4-caaa756aa062','Chief Operating Officer','020e9e92-39b5-59fd-a7eb-88d77b26afbd','employee',1,true) ON CONFLICT DO NOTHING;

-- 43 seat holdings. reports_to_role_id stays NULL: the matrix
-- records level and department, never who reports to whom. Level is a
-- visual band, not a reporting line, so no line is invented here.
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('126f8a36-80d0-5dee-b02c-bb4e194127f6','64a9f94a-ae68-5985-a3a5-bfd662053682','9f8baefd-6c29-545e-b01f-e6c125d5a76f',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('fef3fcc0-b430-531d-82d2-193082c7b9c4','c8c5c316-35b5-5a3f-9ec7-1ddacf12e61e','ba10b9d2-4a48-55bf-b3e6-ccddcfffe100',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('f00a0753-6b9b-5255-b58d-fd35e77a210d','cf455ca9-015a-5889-8e49-8e2aeba23610','536debdf-fa36-5c00-8c2b-f00d5b05f05d',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('2429008d-d9db-512a-95a7-b4b56d4b485a','e831b106-e3fd-5689-862c-e134db34e32f','89236eec-a7bb-56fa-af94-68a43ca79365',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('fe4eca9c-c415-58db-9153-172a89e54e03','961f1338-0fad-5210-a208-5271c092d701','dfcd5bbb-fda7-5f85-af72-a7462da3c209',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('3f9dacc7-7375-5c57-8314-23a2d4364620','9fb442ca-89b8-5884-a1f8-b0636828f3eb','485f7f5a-58b1-5781-b57a-aafcb0da2861',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('309bb112-43a6-51ab-8c7c-f15003ee22bc','e831b106-e3fd-5689-862c-e134db34e32f','601a3586-3221-5374-b276-0c7377cf611f',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('a8cbfcef-1c60-58a3-801d-3f9f9a9039f6','2fcdc382-0180-5524-b3aa-cdbf80fca7ee','33d2aa4f-5fdb-59dc-9107-3b525a32f7b7',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('fe3b2f6b-c04d-5b3e-ab11-b17cee6a1e6e','032753f8-4ff7-5efd-8da5-a570b6449c81','b16e64e3-a942-598a-9f0c-e451a5a94ce7',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('5dade5af-12f6-5433-b127-bcb0e4143629','706c5551-fd4a-5da7-a3e3-258842f3a16d','02bbf2fc-e8de-5916-bcf8-5a5ccaaded8c',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('b4dab5b5-d7f2-5e0f-9d30-8ce20625a41f','90e51171-fba5-5bea-8a9a-ae98285e2868','ab152990-cfbe-596a-9018-9129e39e6cb3',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('ef3751f4-e5a4-59ca-a147-f52d9a70bf47','ead28047-f85b-5e1b-b1af-3fd05676dc54','382c030c-70ac-5010-bfb3-d764870abfab',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('c944ce0d-0c05-5c66-a37e-ba1353c91e4d','9fb442ca-89b8-5884-a1f8-b0636828f3eb','23205adb-38e0-5119-84ff-f46b354a5888',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('3cc162ed-e137-530d-96c0-f35bde50cf00','1ff2899c-743b-5691-acd7-e042c4e98094','8a8b57ea-827e-5ee4-8289-9f69cdf7fdfa',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('d369ec98-94d0-5e0d-bec1-9372ebcc2470','e05a1aef-3a28-5797-83b4-404d86bdac80','d7b6579e-0b59-55c3-8a23-2689c24917ef',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('7697ce05-bdc8-5a7b-a044-47e6a5b16fc6','ead28047-f85b-5e1b-b1af-3fd05676dc54','ea290373-4aa7-53d0-9d11-1a0a3a99b734',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('e514b060-2ecc-51db-8c8e-bf51bc3fdba7','9fb442ca-89b8-5884-a1f8-b0636828f3eb','864c5be8-c73a-537e-87d3-d1c5a86c3202',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('d28d722d-63b6-5934-aa66-0798bc907fd9','33738659-d86a-5971-9864-55ed1101fc1c','24ff8799-bb12-5acb-9b64-0908f36267c8',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('4f060c45-f3f6-5987-a037-333ff54a21db','1afbc141-cb0c-5d21-87d9-230c7f33f94c','04893e9c-ab78-5c4f-a531-f6342a0f851d',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('22dddc3e-4ab0-5d07-81e5-e33bb91b6c19','961f1338-0fad-5210-a208-5271c092d701','02d67f77-54c6-5959-9194-52ac020c29c6',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('3657ccfa-28f5-5b45-b6bb-b6c725a4bd9e','307984fe-4262-5699-be07-51c2ca790fca','47875693-a9fd-5c93-b37e-99a2c35ba948',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('2aad3734-eff3-5a3c-bc84-1440a0e0c24a','8257687b-9fb5-5f3e-980e-be5494bdb3df','a516cddb-4517-5b42-8286-45c79b2679b8',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('857a5337-bc95-5fd6-be8d-ebfa9648a270','73311a8d-34e6-582e-bb28-233030cd97f4','6a9f326a-46ea-50b2-bf00-ce5fd394c7c5',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('348de8c0-caa2-513a-beb4-1d56895fb8af','f240e294-f482-5ff6-a3b2-1b2d2129b3e3','a1d8f1ce-8d43-5e70-a834-8b689b4e9555',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('5d9c1321-665d-5554-ae4f-855a019f2f7a','0d567b02-4ecc-5348-b940-ac91bb28e034','cbe8a564-ae81-574e-8bc7-f8f371babb1b',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('73ca4d8d-a67e-593a-851d-ff500be3fcfd','5d020770-03a2-58fd-ada7-ea869d83e55e','b9fd8573-bbed-5fbe-a701-2a532e20f18d',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('8c057d68-8727-53a4-824c-57c728f6e228','1b86a43c-4941-5c3f-9248-8f8015ae9ef5','0779a506-4c6a-5f95-b494-cf39e52967ec',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('2f56dd5a-0fdb-57a0-bc2c-70fbf488b7a9','16524113-11f1-5abe-a4de-a485e7fc3a23','00ff98b1-226a-512c-84cd-2856cc9b2a31',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('4714a70b-f2e6-59ef-b38b-6249f9ac1b0a','f2c5f1a4-f651-5f5a-b575-e0b37e4cab48','4f552ce0-dcc6-58a3-be90-90c9a9e4e53c',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('da973af5-86c6-5829-af95-498e09d3879c','0dea9af7-9f16-5ead-ac1a-391a03ac00c4','b12ecb5f-c031-5084-afdb-e99b7920ec15',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('915ab414-5ac4-5471-9ee7-243f377fe228','4ea0db10-07d0-59d9-bca5-e04829a26e67','c43b704a-2edd-533b-9818-3b9c7f913aa7',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('ea688ad4-b754-5913-b982-ef654015b392','07436950-e71c-557a-a8ed-8144590914ae','39d2a190-3594-5f6f-8596-ef1106ef92d9',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('a4c466aa-5d01-5e8e-bf64-46c88789151c','73311a8d-34e6-582e-bb28-233030cd97f4','20bd32a9-4c4f-53c9-b21a-548c16b86b7f',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('3cc6a2a6-37b3-5051-8ac3-1b32ab286e78','baa0fbd3-82a0-515d-8ab1-3614e10dd9b0','f27561d7-cd23-5a38-a93d-5a14f27ef56e',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('de430a8f-7797-5428-b5b7-37cbda77d822','e5d705ae-f5a5-5684-867c-a1b2289a2e5b','d3f55805-1f91-520c-92c6-9b8c085af3f0',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('edb69924-33a8-50e6-9021-4e6de4a5cf95','e831b106-e3fd-5689-862c-e134db34e32f','5fa3ad3c-9ace-5004-b6eb-0ac4f77229f1',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('378899b0-d55b-54e3-9b9a-d91f12cca8e6','9fb442ca-89b8-5884-a1f8-b0636828f3eb','09c34c67-b07b-57cb-a1bc-fb14efa7ed30',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('1a4aec41-00dc-57ad-b90e-950bb32005cf','e831b106-e3fd-5689-862c-e134db34e32f','ed163847-1277-5af9-b188-d69a2bca485e',false,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('43293a6f-e95e-5d1c-8e18-ab8835c95a7a','0d3e20e3-1b5a-5912-b463-9c1de2fb458c','11be1a6b-10a8-5a97-b699-4d5733f0bba1',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('cce93387-73b5-5eb5-a37d-67e64b0e039b','6bf4aaf8-c968-5de6-8cb7-35de95453d0c','36c4158f-a985-5acf-ae9c-9344df4c3aaf',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('f9524fed-fcff-5265-a610-7cdd825542ed','50971d4e-e7d2-507a-89da-8465c0a805e6','643297d1-c529-5f28-a3b4-c69a233e4824',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('728b0beb-0387-5cde-ab87-6de2155cc588','2ae44dfe-5a1f-5e15-a38c-09da5d7f8233','6a66b662-1b20-5ea4-ad2e-811a30c9806b',true,'2026-07-01') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_role_id,person_id,role_id,is_primary,valid_from) VALUES ('a0d6da29-7cd9-5ac5-be61-9d80e409bca7','09869d40-f07d-537d-8dc9-e9b77d19a3a1','b40e5cd6-9c8c-56a9-b17e-1631a46ec9c1',true,'2026-07-01') ON CONFLICT DO NOTHING;

-- Professional email addresses, built on the SAME convention already used
-- by backend/app/org_data.py: firstname@katbotz.com, disambiguated to
-- firstname.lastname@katbotz.com wherever two people would collide.
-- These are CONVENTION, not confirmed addresses. Sign-in depends on them,
-- so they are seeded rather than left blank; replace with the real ones
-- once HR confirms. One row per address, which is what lets a single
-- unique index enforce the org-wide rule.
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('63d56112-d4fc-5d18-802a-a4d3e008cf37','64a9f94a-ae68-5985-a3a5-bfd662053682','professional','ashish.katyayan@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('16b32041-c1b6-5597-80de-4be3b737ae75','c8c5c316-35b5-5a3f-9ec7-1ddacf12e61e','professional','priyanka@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('d1523e9e-e7e0-50ec-a96c-e94b30c806fc','cf455ca9-015a-5889-8e49-8e2aeba23610','professional','adesh@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('91afe957-5036-5301-b2ab-ef39e6e026c0','e831b106-e3fd-5689-862c-e134db34e32f','professional','akshat@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('9ef5f06f-9033-5b3e-ab62-0db9f5185115','961f1338-0fad-5210-a208-5271c092d701','professional','vrinda@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('b3f7b5df-133e-5a4d-bf27-40594bc73f42','9fb442ca-89b8-5884-a1f8-b0636828f3eb','professional','karthik@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('501f9b0c-b601-59e5-bca9-9cc3a41c8dc7','2fcdc382-0180-5524-b3aa-cdbf80fca7ee','professional','aparna@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('a16ece3d-11b2-5a2e-8d98-0020910b83db','032753f8-4ff7-5efd-8da5-a570b6449c81','professional','ananya@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('e8e5e849-ca9a-56ea-8e9e-db0ccbefb917','706c5551-fd4a-5da7-a3e3-258842f3a16d','professional','puja@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('c36fc66e-8b93-5716-9e55-bfb64e479d07','90e51171-fba5-5bea-8a9a-ae98285e2868','professional','sarishty@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('d713a39d-3120-5a0b-89f1-7420ad3de3b0','ead28047-f85b-5e1b-b1af-3fd05676dc54','professional','ayushi@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('c7315737-5c84-52bf-9ee3-dc1ce5f9113c','1ff2899c-743b-5691-acd7-e042c4e98094','professional','rinchen@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('36ae151a-1ff4-516a-96ee-ed2c7eee6275','e05a1aef-3a28-5797-83b4-404d86bdac80','professional','shrutkirti@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('fe810b48-c6dd-5b7c-a039-03c4bfaf25c4','33738659-d86a-5971-9864-55ed1101fc1c','professional','bhupender@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('3d571806-9a9a-5234-abd6-7cef7f3a2474','1afbc141-cb0c-5d21-87d9-230c7f33f94c','professional','anchal@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('9d755003-4ef9-56e8-a232-23f06471e841','307984fe-4262-5699-be07-51c2ca790fca','professional','sachin@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('705a9151-c963-5092-bd2d-757778ca5c8e','8257687b-9fb5-5f3e-980e-be5494bdb3df','professional','gourev@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('fbf6708e-a97c-51a0-9a06-49c4757ac8bb','73311a8d-34e6-582e-bb28-233030cd97f4','professional','rishi@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('077ae570-d9c0-5853-b9a2-0471857e2069','f240e294-f482-5ff6-a3b2-1b2d2129b3e3','professional','naisha@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('8b68a8bf-8c94-5fd8-9a1d-6501a57f1fb4','0d567b02-4ecc-5348-b940-ac91bb28e034','professional','anoop@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('e249cb4a-7a64-5b6a-afb6-0af17bb6bb5a','5d020770-03a2-58fd-ada7-ea869d83e55e','professional','diya@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('67c317ca-8546-5b3e-8e43-5187339a43af','1b86a43c-4941-5c3f-9248-8f8015ae9ef5','professional','ashish@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('5fff284e-e9dc-5a7b-bb85-693903a3f945','16524113-11f1-5abe-a4de-a485e7fc3a23','professional','nikhil@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('77dc1f42-6967-516c-b4c5-5dae417a7dba','f2c5f1a4-f651-5f5a-b575-e0b37e4cab48','professional','keya@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('98d9cc33-7d68-54a5-925f-b5acc90469b5','0dea9af7-9f16-5ead-ac1a-391a03ac00c4','professional','saranya@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('bcb9fe11-5a71-545e-9df6-962e324d7771','4ea0db10-07d0-59d9-bca5-e04829a26e67','professional','shardul@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('d3921bda-2ac5-5fb3-88c1-dde5dd7ef202','07436950-e71c-557a-a8ed-8144590914ae','professional','koushika@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('19de8d36-2c0f-5b60-aa3a-3643346af603','baa0fbd3-82a0-515d-8ab1-3614e10dd9b0','professional','khusbhu@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('143a2228-710c-536b-ae92-78b579209bbb','e5d705ae-f5a5-5684-867c-a1b2289a2e5b','professional','biondi@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('c20efb5a-44e3-5edc-a088-7dbd4eefbc6a','0d3e20e3-1b5a-5912-b463-9c1de2fb458c','professional','sateesh@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('76c8dd5d-3664-5639-b642-cf24f96a3b2d','6bf4aaf8-c968-5de6-8cb7-35de95453d0c','professional','vishal@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('0d1b5a66-cb51-5d80-b240-5a1db401c04d','50971d4e-e7d2-507a-89da-8465c0a805e6','professional','rakesh@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('5c12ae31-0859-5bd5-ae3a-984b65e6fa03','2ae44dfe-5a1f-5e15-a38c-09da5d7f8233','professional','tuski@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_email (email_id,person_id,email_type,email) VALUES ('a63ecc59-8fff-58c5-af04-843eb88f104a','09869d40-f07d-537d-8dc9-e9b77d19a3a1','professional','staffi@katbotz.com') ON CONFLICT DO NOTHING;

-- Work locations: the two regions the document checklist branches on.
INSERT INTO work_location (work_location_id,name,country,region,timezone) VALUES ('11d5d547-2f21-5307-a9fa-2b7820b2245b','India office','India','India','Asia/Kolkata') ON CONFLICT DO NOTHING;
INSERT INTO work_location (work_location_id,name,country,region,timezone) VALUES ('d2cb40f8-2c7a-5f09-9a60-d849a6912feb','United States','United States','US','America/New_York') ON CONFLICT DO NOTHING;
INSERT INTO work_location (work_location_id,name,country,region,timezone) VALUES ('d1173ec1-444e-5bd6-9c39-887c4d158932','Remote (India)','India','India','Asia/Kolkata') ON CONFLICT DO NOTHING;
