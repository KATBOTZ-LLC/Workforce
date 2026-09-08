"""Required documents per worker type/location — ported from
frontend/app/lib/workforceStore.tsx's DocReq lists. Kept in exact sync; if one side's
list changes, update the other.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DocReq:
    key: str
    label: str
    mandatory: bool = True
    link: str | None = None


US_CONTRACTOR_INDEPENDENT: list[DocReq] = [
    DocReq("govid", "Government-issued ID (Driver's License, Passport, or State ID)"),
    DocReq("ssn", "Social Security Number (SSN)"),
    DocReq("workauth", "Work Authorization (Green Card, Work Visa, etc.)", mandatory=False),
    DocReq("edu", "Educational Certificates (college / university degrees)"),
    DocReq("empverif", "Previous Employment Verification (Offer / Experience Letters)"),
    DocReq("bank", "Bank Account Details (Direct Deposit Form)"),
    DocReq("w9", "Completed W-9 Form", link="https://www.irs.gov/pub/irs-pdf/fw9.pdf"),
]

US_CONTRACTOR_C2C: list[DocReq] = [
    DocReq("ein", "Employer Identification Number (EIN)"),
    DocReq("statereg", "State Business & Tax Registration"),
    DocReq("bizlicense", "Business License, Incorporation Certificate, or Operating Agreement"),
    DocReq("companybank", "Bank Account Details of the Company"),
    DocReq("candidateid", "Candidate's Government-issued ID (Driver's License, Passport, or State ID)"),
    DocReq("candidateedu", "Candidate's Educational Certificates and Work Experience Letters"),
]

IN_CONTRACTOR_INDEPENDENT: list[DocReq] = [
    DocReq("poi", "Proof of Identity (Passport / Aadhaar / Driving License)"),
    DocReq("poa", "Proof of Address (Passport / Aadhaar / Utility Bill)"),
    DocReq("edu", "Educational Certificates (latest degree/diploma)"),
    DocReq("expletter", "Work Experience Letters"),
    DocReq("relieving", "Relieving Letter from Previous Employer"),
    DocReq("bankdetails", "Bank Account Details (for payroll setup)"),
    DocReq("bankproof", "Proof of Bank Account (Cancelled Cheque / Passbook / Statement)"),
    DocReq("pan", "PAN Card"),
    DocReq("photo", "Recent passport-sized photograph"),
]

IN_CONTRACTOR_C2C: list[DocReq] = [
    DocReq("agencyreg", "Agency Registration Certificate (Incorporation / ROC)"),
    DocReq("gst", "GST Registration Certificate"),
    DocReq("msmed", "MSMED Registration Number"),
    DocReq("companypan", "PAN Card of the Company"),
    DocReq("bizaddr", "Proof of Business Address (Utility bill / Rent agreement)"),
    DocReq("companybank", "Bank Account Details of the Company"),
    DocReq("bankproof", "Proof of Bank Account (Cancelled Cheque / Passbook / Statement)"),
    DocReq("labourlicense", "Labour License", mandatory=False),
    DocReq("ptax", "Professional Tax Registration", mandatory=False),
    DocReq("compliance", "Compliance Certificates", mandatory=False),
    DocReq("candidateaadhaar", "Candidate's Aadhaar Card"),
    DocReq("candidateedu", "Candidate's Educational & Work Experience Certificates"),
]

IN_EMPLOYEE: list[DocReq] = [
    DocReq("pan", "PAN Card"),
    DocReq("aadhaar", "Aadhaar"),
    DocReq("degree", "Degree Certificate"),
    DocReq("tenth", "10th Marksheet"),
    DocReq("twelfth", "12th Marksheet"),
    DocReq("bank", "Bank Proof"),
]

US_EMPLOYEE: list[DocReq] = [
    DocReq("govid", "Government-issued ID (Driver's License, Passport, or State ID)"),
    DocReq("ssn", "Social Security Number (SSN)"),
    DocReq("i9", "Form I-9 (Employment Eligibility Verification)"),
    DocReq("w4", "Completed W-4 Form", link="https://www.irs.gov/pub/irs-pdf/fw4.pdf"),
    DocReq("workauth", "Work Authorization (Green Card / Work Visa, if applicable)", mandatory=False),
    DocReq("edu", "Educational Certificates (college / university degrees)"),
    DocReq("empverif", "Previous Employment Verification (Offer / Experience Letters)"),
    DocReq("bank", "Bank Account Details (Direct Deposit Form)"),
]

IN_INTERN: list[DocReq] = [
    DocReq("passport", "Copy of Passport (first and last pages)"),
    DocReq("pan", "PAN Card"),
    DocReq("aadhaar", "Aadhaar Card"),
    DocReq("edu", "Educational certificates (latest degree / semester marksheets)"),
    DocReq("resume", "Updated resume"),
    DocReq("bank", "Bank account details (for stipend processing)", mandatory=False),
    DocReq("contract", "Signed internship contract", mandatory=False),
    DocReq("emergency", "Emergency contact information form"),
    DocReq("addressproof", "Address proof (utility bill / bank statement, not older than 3 months)"),
]

US_INTERN: list[DocReq] = [
    DocReq("ead", "Employment Authorization Document (EAD) Card"),
    DocReq("i20", "Updated Form I-20 (with DSO signature reflecting OPT authorization)"),
    DocReq("passport", "Passport copy (for identity verification)"),
    DocReq("ssn", "Social Security Number (SSN)", mandatory=False),
    DocReq("i94", "Form I-94 (Arrival / Departure Record)"),
    DocReq("f1visa", "Copy of F-1 Visa", mandatory=False),
    DocReq("resume", "Updated resume"),
    DocReq("contract", "Signed internship contract", mandatory=False),
    DocReq("additional", "Any additional documents requested by your DSO or university", mandatory=False),
]


def region_of(location: str | None) -> str:
    return "US" if location == "US" else "India"


def doc_requirements(worker_type: str, location: str | None = None, contractor_mode: str | None = None) -> list[DocReq]:
    us = region_of(location) == "US"
    if worker_type == "Contractor":
        if contractor_mode == "c2c":
            return US_CONTRACTOR_C2C if us else IN_CONTRACTOR_C2C
        return US_CONTRACTOR_INDEPENDENT if us else IN_CONTRACTOR_INDEPENDENT
    if worker_type == "Intern":
        return US_INTERN if us else IN_INTERN
    return US_EMPLOYEE if us else IN_EMPLOYEE


def docs_for(worker_type: str, location: str | None = None, contractor_mode: str | None = None) -> list[dict]:
    return [
        {"key": d.key, "label": d.label, "mandatory": d.mandatory, "link": d.link, "status": "not_uploaded"}
        for d in doc_requirements(worker_type, location, contractor_mode)
    ]
