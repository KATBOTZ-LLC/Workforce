"""Canonical KATBOTZ org chart — ported from frontend/app/lib/orgSource.ts.

This is a temporary duplication: today the frontend keeps its own copy of this data
in TypeScript for the client-only build, and this Python copy exists so the backend
can resolve identity/access without waiting on the org-chart CRUD API. Once that API
exists (Firestore-backed), this becomes the seed data for a one-time migration and the
frontend should fetch from the API instead of keeping a hardcoded copy at all — two
hand-maintained copies of "the org" is exactly the kind of drift this whole effort is
trying to eliminate.

Keep this file's data in sync with orgSource.ts if either changes before the real
migration happens.
"""

from dataclasses import dataclass, field

ROOT_UNIT = "unit_katbotz"


@dataclass(frozen=True)
class Unit:
    id: str
    name: str
    parent_id: str | None


@dataclass(frozen=True)
class Person:
    id: str
    display_name: str


@dataclass(frozen=True)
class Role:
    id: str
    person_id: str | None
    unit_id: str
    level: int
    title: str
    is_primary: bool = False
    # The tier this SEAT carries, from ROLE.base_tier in PostgreSQL. None for the
    # hardcoded seed below, where tier is inferred from unit/level/title instead.
    base_tier: str | None = None


@dataclass(frozen=True)
class Edge:
    id: str
    from_role_id: str
    to_role_id: str
    type: str  # 'reports_to' | 'accountable_to' | 'dotted'


UNITS: list[Unit] = [
    Unit(ROOT_UNIT, "KATBOTZ", None),
    Unit("unit_hr", "HR", ROOT_UNIT),
    Unit("unit_recruiting", "Recruiting", ROOT_UNIT),
    Unit("unit_marketing", "Marketing", ROOT_UNIT),
    Unit("unit_bd", "Business Development", ROOT_UNIT),
    Unit("unit_procurement", "Procurement", ROOT_UNIT),
    Unit("unit_finance", "Finance", ROOT_UNIT),
    Unit("unit_innovation", "Innovation", ROOT_UNIT),
    Unit("unit_legal", "Legal", ROOT_UNIT),
    Unit("unit_alliances", "Alliances", ROOT_UNIT),
    Unit("unit_internship", "Internship", ROOT_UNIT),
    Unit("unit_it", "IT / System Admin", ROOT_UNIT),
    Unit("unit_operations", "Operations", ROOT_UNIT),
]

PEOPLE: list[Person] = [
    Person("person_ashish_katyayan", "Ashish Katyayan"),
    Person("person_priyanka_katyayan", "Priyanka Katyayan"),
    Person("person_adesh_katyayan", "Adesh Katyayan"),
    Person("person_akshat", "Akshat"),
    Person("person_vrinda", "Vrinda"),
    Person("person_karthik", "Karthik"),
    Person("person_aparna_sarishty", "Aparna Sarishty"),
    Person("person_ananya", "Ananya"),
    Person("person_puja", "Puja"),
    Person("person_sarishty_varsha", "Sarishty Varsha"),
    Person("person_ayushi", "Ayushi"),
    Person("person_rinchen", "Rinchen"),
    Person("person_shrutkirti", "Shrutkirti"),
    Person("person_bhupender_pruthi", "Bhupender Pruthi"),
    Person("person_anchal_verma", "Anchal Verma"),
    Person("person_sachin_doger", "Sachin Doger"),
    Person("person_gourev", "Gourev"),
    Person("person_rishi", "Rishi"),
    Person("person_naisha", "Naisha"),
    Person("person_anoop", "Anoop"),
    Person("person_diya_thakur", "Diya Thakur"),
    Person("person_ashish", "Ashish"),
    Person("person_nikhil_rao", "Nikhil Rao"),
    Person("person_keya", "Keya"),
    Person("person_saranya", "Saranya"),
    Person("person_shardul", "Shardul"),
    Person("person_koushika", "Koushika"),
    Person("person_khusbhu", "Khusbhu"),
    Person("person_biondi", "Biondi"),
    Person("person_sateesh", "Sateesh"),
    Person("person_vishal", "Vishal"),
    Person("person_rakesh", "Rakesh"),
    Person("person_tuski", "Tuski"),
    Person("person_staffi", "Staffi"),
]

ROLES: list[Role] = [
    Role("role_ceo", "person_ashish_katyayan", ROOT_UNIT, 0, "CEO & Founder", True),
    Role("role_cofounder_coo", "person_priyanka_katyayan", ROOT_UNIT, 0, "Co-Founder / COO", True),
    Role("role_director_india", "person_adesh_katyayan", ROOT_UNIT, 0, "Director India", True),
    Role("role_cos_akshat", "person_akshat", ROOT_UNIT, 0, "Chief of Staff", True),
    Role("role_cos_vrinda", "person_vrinda", ROOT_UNIT, 0, "Chief of Staff", True),
    Role("role_cos_karthik", "person_karthik", ROOT_UNIT, 0, "Chief of Staff", True),

    Role("role_global_hr_lead", "person_akshat", "unit_hr", 1, "Global HR Lead"),
    Role("role_ops_lead", "person_aparna_sarishty", "unit_hr", 2, "Operations Lead", True),
    Role("role_ops_manager", None, "unit_hr", 3, "Operations Manager"),
    Role("role_hr_intern_ananya", "person_ananya", "unit_hr", 4, "Intern", True),

    Role("role_recruitment_lead", "person_puja", "unit_recruiting", 2, "Recruitment Lead", True),
    Role("role_recruitment_manager", "person_sarishty_varsha", "unit_recruiting", 3, "Recruitment Manager", True),

    Role("role_global_mkt_bd_lead", "person_ayushi", "unit_marketing", 1, "Global Marketing & BD Lead", True),
    Role("role_marketing_lead", "person_karthik", "unit_marketing", 2, "Marketing Lead"),
    Role("role_marketing_manager", "person_rinchen", "unit_marketing", 3, "Marketing Manager", True),
    Role("role_business_marketing_analyst", "person_shrutkirti", "unit_marketing", 3, "Business Marketing Analyst", True),

    Role("role_sales_lead", "person_ayushi", "unit_bd", 2, "Sales Lead"),
    Role("role_business_analyst", "person_karthik", "unit_bd", 2, "Business Analyst"),
    Role("role_bd_bhupender", "person_bhupender_pruthi", "unit_bd", 2, "Business Development", True),

    Role("role_fractional_cfo", "person_anchal_verma", "unit_finance", 1, "Fractional CFO (Global)", True),
    Role("role_fin_ops_lead_us", "person_vrinda", "unit_finance", 1, "Finance Operations Lead (US)"),
    Role("role_ca_india", "person_sachin_doger", "unit_finance", 1, "Chartered Accountant (India)", True),
    Role("role_company_secretary", "person_gourev", "unit_finance", 1, "Company Secretary (India)", True),
    Role("role_finance_manager", "person_rishi", "unit_finance", 2, "Finance Manager", True),
    Role("role_jr_financial_analyst", "person_naisha", "unit_finance", 3, "Jr Financial Analyst", True),
    Role("role_accountant", "person_anoop", "unit_finance", 3, "Accountant", True),
    Role("role_junior_accountant", "person_diya_thakur", "unit_finance", 4, "Junior Accountant", True),

    Role("role_global_tech_lead", "person_ashish", "unit_innovation", 1, "Global Tech Innovation Lead", True),
    Role("role_cfo_lead", "person_nikhil_rao", "unit_innovation", 2, "CFO Lead", True),
    Role("role_website_lead", "person_keya", "unit_innovation", 2, "Website Lead", True),
    Role("role_databricks_lead", "person_saranya", "unit_innovation", 2, "Databricks / SAP BDC Lead", True),
    Role("role_cwi_aiml", "person_shardul", "unit_innovation", 2, "CWI / AI-ML", True),
    Role("role_gcp_architect", "person_koushika", "unit_innovation", 2, "GCP Lead Architect", True),
    Role("role_finance_analyst", "person_rishi", "unit_innovation", 3, "Finance Analyst"),
    Role("role_full_stack_dev", "person_khusbhu", "unit_innovation", 3, "Full Stack Developer", True),
    Role("role_ml_engineer", "person_biondi", "unit_innovation", 3, "ML Engineer", True),

    Role("role_hr_legal_lead", "person_akshat", "unit_legal", 1, "HR Legal & Compliance Lead"),
    Role("role_legal_analysts", None, "unit_legal", 2, "Legal Analysts"),

    Role("role_sap_partnership_lead", "person_karthik", "unit_alliances", 2, "SAP Partnership Lead"),

    Role("role_talent_education_lead", "person_akshat", "unit_internship", 1, "Talent & Education Lead"),
    Role("role_sap_curriculum_lead", None, "unit_internship", 2, "SAP Curriculum Lead"),
    Role("role_fico_sme", "person_sateesh", "unit_internship", 2, "FICO SME", True),
    Role("role_otc_sme", "person_vishal", "unit_internship", 2, "OTC SME", True),
    Role("role_pm_sme", None, "unit_internship", 2, "PM SME"),
    Role("role_qm_sme", None, "unit_internship", 2, "QM SME"),
    Role("role_abap_sme", "person_rakesh", "unit_internship", 2, "ABAP SME", True),
    Role("role_pmgmt_sme_tuski", "person_tuski", "unit_internship", 2, "Project Mgmt SME", True),
    Role("role_pmgmt_sme_staffi", "person_staffi", "unit_internship", 2, "Project Mgmt SME", True),

    Role("role_it_manager", None, "unit_it", 2, "IT Manager"),

    Role("role_coo_operations", None, "unit_operations", 1, "Chief Operating Officer"),
]

# The source records no reporting relationships. None are invented — see orgSource.ts.
EDGES: list[Edge] = []


def _base_email(display_name: str) -> str:
    first = display_name.split(" ")[0].lower()
    return f"{first}@katbotz.com"


def _full_email(display_name: str) -> str:
    parts = display_name.lower().split(" ")
    return f"{'.'.join(parts)}@katbotz.com"


def _build_email_map() -> dict[str, str]:
    """firstname@katbotz.com by convention (unconfirmed — see backend/README.md);
    disambiguated to firstname.lastname@katbotz.com wherever two people would
    otherwise collide (e.g. "Ashish Katyayan" and "Ashish" are different real
    people per orgSource.ts's own note — never merge them)."""
    base_counts: dict[str, int] = {}
    for p in PEOPLE:
        base_counts[_base_email(p.display_name)] = base_counts.get(_base_email(p.display_name), 0) + 1

    result: dict[str, str] = {}
    for p in PEOPLE:
        base = _base_email(p.display_name)
        result[p.id] = _full_email(p.display_name) if base_counts[base] > 1 else base
    return result


EMAIL_BY_PERSON_ID: dict[str, str] = _build_email_map()
PERSON_ID_BY_EMAIL: dict[str, str] = {email: pid for pid, email in EMAIL_BY_PERSON_ID.items()}

UNIT_BY_ID: dict[str, Unit] = {u.id: u for u in UNITS}
PERSON_BY_ID: dict[str, Person] = {p.id: p for p in PEOPLE}


def primary_role_of(person_id: str) -> Role | None:
    return next((r for r in ROLES if r.person_id == person_id and r.is_primary), None)


def roles_of(person_id: str) -> list[Role]:
    return [r for r in ROLES if r.person_id == person_id]
