"""The real org-chart data layer — Firestore-backed, replacing both the frontend's
localStorage (orgStore.tsx) and the temporary hardcoded org_data.py for anything that
runs through this repo. See 03-DATABASE.md for the schema this implements.

org_data.py's PEOPLE/UNITS/ROLES/EDGES lists are used exactly once, by
`seed_if_empty()`, to bootstrap Firestore on first run — after that, Firestore is the
only source of truth and org_data.py's lists are never read again.
"""

from dataclasses import asdict
from typing import Literal

from google.cloud import firestore

from . import org_data
from .firestore_client import get_db
from .org_data import Edge, Person, Role, Unit

COL_PEOPLE = "org_people"
COL_UNITS = "org_units"
COL_ROLES = "org_roles"
COL_EDGES = "org_edges"
COL_AUDIT = "org_audit_log"

ROOT_UNIT = org_data.ROOT_UNIT


class OrgSnapshot:
    def __init__(self, people: list[Person], units: list[Unit], roles: list[Role], edges: list[Edge]):
        self.people = people
        self.units = units
        self.roles = roles
        self.edges = edges

    def person_by_id(self, person_id: str) -> Person | None:
        return next((p for p in self.people if p.id == person_id), None)

    def unit_by_id(self, unit_id: str) -> Unit | None:
        return next((u for u in self.units if u.id == unit_id), None)

    def primary_role_of(self, person_id: str) -> Role | None:
        return next((r for r in self.roles if r.person_id == person_id and r.is_primary), None)

    def roles_of(self, person_id: str) -> list[Role]:
        return [r for r in self.roles if r.person_id == person_id]


def _doc_to_person(doc_id: str, data: dict) -> Person:
    return Person(id=doc_id, display_name=data["display_name"])


def _doc_to_unit(doc_id: str, data: dict) -> Unit:
    return Unit(id=doc_id, name=data["name"], parent_id=data.get("parent_id"))


def _doc_to_role(doc_id: str, data: dict) -> Role:
    return Role(
        id=doc_id, person_id=data.get("person_id"), unit_id=data["unit_id"],
        level=data["level"], title=data["title"], is_primary=data.get("is_primary", False),
    )


def _doc_to_edge(doc_id: str, data: dict) -> Edge:
    return Edge(id=doc_id, from_role_id=data["from_role_id"], to_role_id=data["to_role_id"], type=data["type"])


def is_seeded() -> bool:
    db = get_db()
    return next(db.collection(COL_UNITS).limit(1).stream(), None) is not None


def seed_if_empty() -> None:
    """One-time bootstrap from org_data.py's hardcoded lists. A no-op once any unit
    document exists — this never overwrites live edits made through the API."""
    if is_seeded():
        return
    db = get_db()
    batch = db.batch()
    for u in org_data.UNITS:
        batch.set(db.collection(COL_UNITS).document(u.id), {"name": u.name, "parent_id": u.parent_id})
    for p in org_data.PEOPLE:
        batch.set(
            db.collection(COL_PEOPLE).document(p.id),
            {"display_name": p.display_name, "email": org_data.EMAIL_BY_PERSON_ID[p.id]},
        )
    for r in org_data.ROLES:
        batch.set(
            db.collection(COL_ROLES).document(r.id),
            {"person_id": r.person_id, "unit_id": r.unit_id, "level": r.level, "title": r.title, "is_primary": r.is_primary},
        )
    for e in org_data.EDGES:
        batch.set(
            db.collection(COL_EDGES).document(e.id),
            {"from_role_id": e.from_role_id, "to_role_id": e.to_role_id, "type": e.type},
        )
    batch.commit()


def get_snapshot() -> OrgSnapshot:
    db = get_db()
    people = [_doc_to_person(d.id, d.to_dict()) for d in db.collection(COL_PEOPLE).stream()]
    units = [_doc_to_unit(d.id, d.to_dict()) for d in db.collection(COL_UNITS).stream()]
    roles = [_doc_to_role(d.id, d.to_dict()) for d in db.collection(COL_ROLES).stream()]
    edges = [_doc_to_edge(d.id, d.to_dict()) for d in db.collection(COL_EDGES).stream()]
    return OrgSnapshot(people, units, roles, edges)


def person_id_for_email(email: str) -> str | None:
    """Looks up the live org_people email field — not org_data.py's convention
    function — so an HR-corrected email takes effect immediately."""
    db = get_db()
    docs = list(db.collection(COL_PEOPLE).where("email", "==", email.lower()).limit(1).stream())
    return docs[0].id if docs else None


def log_audit(actor: str, summary: str, before: str | None = None, after: str | None = None) -> None:
    get_db().collection(COL_AUDIT).add({
        "actor": actor, "summary": summary, "before": before, "after": after,
        "created_at": firestore.SERVER_TIMESTAMP,
    })


def get_audit_log(limit: int = 200) -> list[dict]:
    db = get_db()
    query = db.collection(COL_AUDIT).order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
    out = []
    for doc in query.stream():
        data = doc.to_dict()
        created_at = data.get("created_at")
        out.append({
            "id": doc.id, "actor": data.get("actor", ""), "summary": data.get("summary", ""),
            "before": data.get("before"), "after": data.get("after"),
            "created_at": created_at.isoformat() if created_at else None,
        })
    return out


# ---------------------------------------------------------------------------
# Mutations. Each mirrors a case in the frontend's orgStore.tsx reducer exactly —
# same pruning/reparenting rules — so behavior doesn't drift between the two while
# both exist.
# ---------------------------------------------------------------------------

def add_person(display_name: str, actor: str) -> str:
    db = get_db()
    doc_ref = db.collection(COL_PEOPLE).document()
    doc_ref.set({"display_name": display_name.strip(), "email": ""})
    log_audit(actor, f"Added {display_name.strip()}")
    return doc_ref.id


def update_person(person_id: str, patch: dict, actor: str) -> None:
    db = get_db()
    before_doc = db.collection(COL_PEOPLE).document(person_id).get()
    before_name = before_doc.to_dict().get("display_name") if before_doc.exists else None
    db.collection(COL_PEOPLE).document(person_id).set(patch, merge=True)
    if "display_name" in patch and before_name and patch["display_name"] != before_name:
        log_audit(actor, "Renamed a person", before_name, patch["display_name"])


def delete_person(person_id: str, actor: str) -> None:
    """Removing a person removes the roles they held and every edge on those roles —
    matches orgStore.tsx's DELETE_PERSON case."""
    db = get_db()
    person_doc = db.collection(COL_PEOPLE).document(person_id).get()
    name = person_doc.to_dict().get("display_name", person_id) if person_doc.exists else person_id

    role_docs = list(db.collection(COL_ROLES).where("person_id", "==", person_id).stream())
    role_ids = {d.id for d in role_docs}

    batch = db.batch()
    for d in role_docs:
        batch.delete(d.reference)
    for d in db.collection(COL_EDGES).stream():
        e = d.to_dict()
        if e["from_role_id"] in role_ids or e["to_role_id"] in role_ids:
            batch.delete(d.reference)
    batch.delete(db.collection(COL_PEOPLE).document(person_id))
    batch.commit()
    log_audit(actor, f"Deleted {name} and their roles/relationships")


def add_role(person_id: str | None, unit_id: str, level: int, title: str, is_primary: bool, actor: str) -> str:
    db = get_db()
    doc_ref = db.collection(COL_ROLES).document()
    doc_ref.set({"person_id": person_id, "unit_id": unit_id, "level": level, "title": title.strip(), "is_primary": is_primary})
    log_audit(actor, f'Added role "{title.strip()}"')
    return doc_ref.id


def update_role(role_id: str, patch: dict, actor: str) -> None:
    db = get_db()
    before_doc = db.collection(COL_ROLES).document(role_id).get()
    title = before_doc.to_dict().get("title", role_id) if before_doc.exists else role_id
    # isOpen is derived from person_id in the frontend model — there's no isOpen field
    # to keep in sync here since Firestore roles don't store it at all.
    db.collection(COL_ROLES).document(role_id).set(patch, merge=True)
    log_audit(actor, f'Updated role "{title}"')


def delete_role(role_id: str, actor: str) -> None:
    db = get_db()
    doc = db.collection(COL_ROLES).document(role_id).get()
    title = doc.to_dict().get("title", role_id) if doc.exists else role_id
    batch = db.batch()
    batch.delete(db.collection(COL_ROLES).document(role_id))
    for d in db.collection(COL_EDGES).stream():
        e = d.to_dict()
        if e["from_role_id"] == role_id or e["to_role_id"] == role_id:
            batch.delete(d.reference)
    batch.commit()
    log_audit(actor, f'Removed role "{title}"')


def add_unit(name: str, parent_id: str | None, actor: str) -> str:
    db = get_db()
    doc_ref = db.collection(COL_UNITS).document()
    doc_ref.set({"name": name.strip(), "parent_id": parent_id or ROOT_UNIT})
    log_audit(actor, f'Added department "{name.strip()}"')
    return doc_ref.id


def rename_unit(unit_id: str, name: str, actor: str) -> None:
    db = get_db()
    before_doc = db.collection(COL_UNITS).document(unit_id).get()
    before_name = before_doc.to_dict().get("name") if before_doc.exists else None
    db.collection(COL_UNITS).document(unit_id).update({"name": name.strip()})
    if before_name:
        log_audit(actor, "Renamed department", before_name, name.strip())


def delete_unit(unit_id: str, actor: str) -> None:
    """Children move up a level; roles in the unit move to its parent — matches
    orgStore.tsx's DELETE_UNIT case. The root unit can never be deleted."""
    if unit_id == ROOT_UNIT:
        return
    db = get_db()
    unit_doc = db.collection(COL_UNITS).document(unit_id).get()
    if not unit_doc.exists:
        return
    unit = unit_doc.to_dict()
    parent = unit.get("parent_id") or ROOT_UNIT
    name = unit.get("name", unit_id)

    batch = db.batch()
    for d in db.collection(COL_UNITS).where("parent_id", "==", unit_id).stream():
        batch.update(d.reference, {"parent_id": parent})
    for d in db.collection(COL_ROLES).where("unit_id", "==", unit_id).stream():
        batch.update(d.reference, {"unit_id": parent})
    batch.delete(db.collection(COL_UNITS).document(unit_id))
    batch.commit()
    log_audit(actor, f'Deleted department "{name}"')


def add_edge(from_role_id: str, to_role_id: str, edge_type: Literal["reports_to", "accountable_to", "dotted"], actor: str) -> str | None:
    if from_role_id == to_role_id:
        return None
    db = get_db()
    existing = db.collection(COL_EDGES) \
        .where("from_role_id", "==", from_role_id) \
        .where("to_role_id", "==", to_role_id) \
        .where("type", "==", edge_type).limit(1).stream()
    if next(existing, None) is not None:
        return None
    doc_ref = db.collection(COL_EDGES).document()
    doc_ref.set({"from_role_id": from_role_id, "to_role_id": to_role_id, "type": edge_type})
    log_audit(actor, f"Added relationship ({edge_type})")
    return doc_ref.id


def delete_edge(edge_id: str, actor: str) -> None:
    get_db().collection(COL_EDGES).document(edge_id).delete()
    log_audit(actor, "Removed a relationship")


def reset_to_source(actor: str) -> None:
    """Wipes all four collections and reseeds from org_data.py — the one place this
    module still reads the hardcoded seed after initial bootstrap."""
    db = get_db()
    batch = db.batch()
    for col in (COL_PEOPLE, COL_UNITS, COL_ROLES, COL_EDGES):
        for d in db.collection(col).stream():
            batch.delete(d.reference)
    batch.commit()
    for u in org_data.UNITS:
        db.collection(COL_UNITS).document(u.id).set({"name": u.name, "parent_id": u.parent_id})
    for p in org_data.PEOPLE:
        db.collection(COL_PEOPLE).document(p.id).set({"display_name": p.display_name, "email": org_data.EMAIL_BY_PERSON_ID[p.id]})
    for r in org_data.ROLES:
        db.collection(COL_ROLES).document(r.id).set(
            {"person_id": r.person_id, "unit_id": r.unit_id, "level": r.level, "title": r.title, "is_primary": r.is_primary}
        )
    log_audit(actor, "Reset the entire organization to the HR matrix source")
