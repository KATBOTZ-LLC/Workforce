/**
 * KATBOTZ organization — canonical seed.
 *
 * Normalized from KATBOTZ_HR_Process_Document_2026 → "Org Matrix July 2026".
 *
 * Rules applied when normalizing:
 *  - One Person per human. People holding several positions get several Roles.
 *  - Compound cells ("Akshat/Vrinda/Karthik", "Tuski/Staffi") are split into
 *    separate Person + Role records.
 *  - Cells with a title but no name become open Roles (personId: null), never people.
 *  - All 12 departments are kept exactly as named. Nothing is merged or renamed.
 *
 *  - EDGES ARE EMPTY. The matrix records level and department; it does not record
 *    who reports to whom. Level is a visual band, not a reporting line, so no
 *    reporting relationship is invented here. Edges are authored in Edit Structure.
 */

import type { Edge, Person, Role, Unit } from './orgModel'

export const ROOT_UNIT = 'unit_katbotz'

export const SEED_UNITS: Unit[] = [
  { id: ROOT_UNIT, name: 'KATBOTZ', parentId: null },
  { id: 'unit_hr', name: 'HR', parentId: ROOT_UNIT },
  { id: 'unit_recruiting', name: 'Recruiting', parentId: ROOT_UNIT },
  { id: 'unit_marketing', name: 'Marketing', parentId: ROOT_UNIT },
  { id: 'unit_bd', name: 'Business Development', parentId: ROOT_UNIT },
  { id: 'unit_procurement', name: 'Procurement', parentId: ROOT_UNIT },
  { id: 'unit_finance', name: 'Finance', parentId: ROOT_UNIT },
  { id: 'unit_innovation', name: 'Innovation', parentId: ROOT_UNIT },
  { id: 'unit_legal', name: 'Legal', parentId: ROOT_UNIT },
  { id: 'unit_alliances', name: 'Alliances', parentId: ROOT_UNIT },
  { id: 'unit_internship', name: 'Internship', parentId: ROOT_UNIT },
  { id: 'unit_it', name: 'IT / System Admin', parentId: ROOT_UNIT },
  { id: 'unit_operations', name: 'Operations', parentId: ROOT_UNIT },
]

/**
 * 34 humans. Aliases are only set where the source itself uses two spellings for a
 * confirmed single identity. First-name similarity alone is never treated as a match —
 * "Ashish" (Global Tech Innovation Lead) is deliberately NOT aliased to
 * "Ashish Katyayan" (CEO) because the source does not confirm they are one person.
 */
export const SEED_PEOPLE: Person[] = [
  { id: 'person_ashish_katyayan', displayName: 'Ashish Katyayan', aliases: [] },
  { id: 'person_priyanka_katyayan', displayName: 'Priyanka Katyayan', aliases: [] },
  { id: 'person_adesh_katyayan', displayName: 'Adesh Katyayan', aliases: [] },
  { id: 'person_akshat', displayName: 'Akshat', aliases: [] },
  { id: 'person_vrinda', displayName: 'Vrinda', aliases: [] },
  { id: 'person_karthik', displayName: 'Karthik', aliases: [] },

  { id: 'person_aparna_sarishty', displayName: 'Aparna Sarishty', aliases: [] },
  { id: 'person_ananya', displayName: 'Ananya', aliases: [] },
  { id: 'person_puja', displayName: 'Puja', aliases: [] },
  { id: 'person_sarishty_varsha', displayName: 'Sarishty Varsha', aliases: [] },

  { id: 'person_ayushi', displayName: 'Ayushi', aliases: [] },
  { id: 'person_rinchen', displayName: 'Rinchen', aliases: [] },
  { id: 'person_shrutkirti', displayName: 'Shrutkirti', aliases: [] },
  { id: 'person_bhupender_pruthi', displayName: 'Bhupender Pruthi', aliases: [] },

  { id: 'person_anchal_verma', displayName: 'Anchal Verma', aliases: [] },
  { id: 'person_sachin_doger', displayName: 'Sachin Doger', aliases: [] },
  { id: 'person_gourev', displayName: 'Gourev', aliases: [] },
  { id: 'person_rishi', displayName: 'Rishi', aliases: [] },
  { id: 'person_naisha', displayName: 'Naisha', aliases: [] },
  { id: 'person_anoop', displayName: 'Anoop', aliases: [] },
  { id: 'person_diya_thakur', displayName: 'Diya Thakur', aliases: [] },

  { id: 'person_ashish', displayName: 'Ashish', aliases: [] },
  { id: 'person_nikhil_rao', displayName: 'Nikhil Rao', aliases: [] },
  { id: 'person_keya', displayName: 'Keya', aliases: [] },
  { id: 'person_saranya', displayName: 'Saranya', aliases: [] },
  { id: 'person_shardul', displayName: 'Shardul', aliases: [] },
  { id: 'person_koushika', displayName: 'Koushika', aliases: [] },
  { id: 'person_khusbhu', displayName: 'Khusbhu', aliases: [] },
  { id: 'person_biondi', displayName: 'Biondi', aliases: [] },

  { id: 'person_sateesh', displayName: 'Sateesh', aliases: [] },
  { id: 'person_vishal', displayName: 'Vishal', aliases: [] },
  { id: 'person_rakesh', displayName: 'Rakesh', aliases: [] },
  { id: 'person_tuski', displayName: 'Tuski', aliases: [] },
  { id: 'person_staffi', displayName: 'Staffi', aliases: [] },
]

type Seed = [id: string, personId: string | null, unitId: string, level: 0 | 1 | 2 | 3 | 4, title: string, primary?: boolean]

const SEED: Seed[] = [
  // ---- Level 0 · executive. "Chief of Staff (Akshat/Vrinda/Karthik)" is one source
  // cell naming three people, so it becomes three roles.
  ['role_ceo', 'person_ashish_katyayan', ROOT_UNIT, 0, 'CEO & Founder', true],
  ['role_cofounder_coo', 'person_priyanka_katyayan', ROOT_UNIT, 0, 'Co-Founder / COO', true],
  ['role_director_india', 'person_adesh_katyayan', ROOT_UNIT, 0, 'Director India', true],
  ['role_cos_akshat', 'person_akshat', ROOT_UNIT, 0, 'Chief of Staff', true],
  ['role_cos_vrinda', 'person_vrinda', ROOT_UNIT, 0, 'Chief of Staff', true],
  ['role_cos_karthik', 'person_karthik', ROOT_UNIT, 0, 'Chief of Staff', true],

  // ---- HR
  ['role_global_hr_lead', 'person_akshat', 'unit_hr', 1, 'Global HR Lead'],
  ['role_ops_lead', 'person_aparna_sarishty', 'unit_hr', 2, 'Operations Lead', true],
  ['role_ops_manager', null, 'unit_hr', 3, 'Operations Manager'],
  ['role_hr_intern_ananya', 'person_ananya', 'unit_hr', 4, 'Intern', true],

  // ---- Recruiting
  ['role_recruitment_lead', 'person_puja', 'unit_recruiting', 2, 'Recruitment Lead', true],
  ['role_recruitment_manager', 'person_sarishty_varsha', 'unit_recruiting', 3, 'Recruitment Manager', true],

  // ---- Marketing (the source merges the Level 1 lead across Recruiting/Marketing/BD;
  // the role is filed under Marketing, which its title names)
  ['role_global_mkt_bd_lead', 'person_ayushi', 'unit_marketing', 1, 'Global Marketing & BD Lead', true],
  ['role_marketing_lead', 'person_karthik', 'unit_marketing', 2, 'Marketing Lead'],
  ['role_marketing_manager', 'person_rinchen', 'unit_marketing', 3, 'Marketing Manager', true],
  ['role_business_marketing_analyst', 'person_shrutkirti', 'unit_marketing', 3, 'Business Marketing Analyst', true],

  // ---- Business Development
  ['role_sales_lead', 'person_ayushi', 'unit_bd', 2, 'Sales Lead'],
  ['role_business_analyst', 'person_karthik', 'unit_bd', 2, 'Business Analyst'],
  ['role_bd_bhupender', 'person_bhupender_pruthi', 'unit_bd', 2, 'Business Development', true],

  // ---- Procurement has no roles listed in the source. The unit is kept, deliberately empty.

  // ---- Finance
  ['role_fractional_cfo', 'person_anchal_verma', 'unit_finance', 1, 'Fractional CFO (Global)', true],
  ['role_fin_ops_lead_us', 'person_vrinda', 'unit_finance', 1, 'Finance Operations Lead (US)'],
  ['role_ca_india', 'person_sachin_doger', 'unit_finance', 1, 'Chartered Accountant (India)', true],
  ['role_company_secretary', 'person_gourev', 'unit_finance', 1, 'Company Secretary (India)', true],
  ['role_finance_manager', 'person_rishi', 'unit_finance', 2, 'Finance Manager', true],
  ['role_jr_financial_analyst', 'person_naisha', 'unit_finance', 3, 'Jr Financial Analyst', true],
  ['role_accountant', 'person_anoop', 'unit_finance', 3, 'Accountant', true],
  ['role_junior_accountant', 'person_diya_thakur', 'unit_finance', 4, 'Junior Accountant', true],

  // ---- Innovation
  ['role_global_tech_lead', 'person_ashish', 'unit_innovation', 1, 'Global Tech Innovation Lead', true],
  ['role_cfo_lead', 'person_nikhil_rao', 'unit_innovation', 2, 'CFO Lead', true],
  ['role_website_lead', 'person_keya', 'unit_innovation', 2, 'Website Lead', true],
  ['role_databricks_lead', 'person_saranya', 'unit_innovation', 2, 'Databricks / SAP BDC Lead', true],
  ['role_cwi_aiml', 'person_shardul', 'unit_innovation', 2, 'CWI / AI-ML', true],
  ['role_gcp_architect', 'person_koushika', 'unit_innovation', 2, 'GCP Lead Architect', true],
  ['role_finance_analyst', 'person_rishi', 'unit_innovation', 3, 'Finance Analyst'],
  ['role_full_stack_dev', 'person_khusbhu', 'unit_innovation', 3, 'Full Stack Developer', true],
  ['role_ml_engineer', 'person_biondi', 'unit_innovation', 3, 'ML Engineer', true],

  // ---- Legal
  ['role_hr_legal_lead', 'person_akshat', 'unit_legal', 1, 'HR Legal & Compliance Lead'],
  ['role_legal_analysts', null, 'unit_legal', 2, 'Legal Analysts'],

  // ---- Alliances
  ['role_sap_partnership_lead', 'person_karthik', 'unit_alliances', 2, 'SAP Partnership Lead'],

  // ---- Internship
  ['role_talent_education_lead', 'person_akshat', 'unit_internship', 1, 'Talent & Education Lead'],
  ['role_sap_curriculum_lead', null, 'unit_internship', 2, 'SAP Curriculum Lead'],
  ['role_fico_sme', 'person_sateesh', 'unit_internship', 2, 'FICO SME', true],
  ['role_otc_sme', 'person_vishal', 'unit_internship', 2, 'OTC SME', true],
  ['role_pm_sme', null, 'unit_internship', 2, 'PM SME'],
  ['role_qm_sme', null, 'unit_internship', 2, 'QM SME'],
  ['role_abap_sme', 'person_rakesh', 'unit_internship', 2, 'ABAP SME', true],
  ['role_pmgmt_sme_tuski', 'person_tuski', 'unit_internship', 2, 'Project Mgmt SME', true],
  ['role_pmgmt_sme_staffi', 'person_staffi', 'unit_internship', 2, 'Project Mgmt SME', true],

  // ---- IT / System Admin
  ['role_it_manager', null, 'unit_it', 2, 'IT Manager'],

  // ---- Operations
  ['role_coo_operations', null, 'unit_operations', 1, 'Chief Operating Officer'],

  // NOTE: the source's Level 4 row repeats the word "Intern" across the department
  // columns as a band label, without naming anyone or stating a vacancy count. Those
  // cells are deliberately NOT turned into roles — doing so would manufacture ~13
  // interns that do not exist. Only the two named Level 4 people are kept
  // (Ananya in HR, Diya Thakur in Finance).
]

export const SEED_ROLES: Role[] = SEED.map(([id, personId, unitId, level, title, primary]) => ({
  id, personId, unitId, level, title,
  isPrimary: !!primary,
  isOpen: personId === null,
}))

/** The source records no reporting relationships. None are invented. */
export const SEED_EDGES: Edge[] = []
