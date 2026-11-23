-- Rental Desk's side rail: Rentals, Equipment, Customers — the forms added to
-- the menu in Configure UI ("form:<key>" opens /forms/<key>), in the order and
-- under the labels set in Configure UI → Menu. The Tasks sample is hidden, not
-- removed. Idempotent: re-running changes nothing that is already there.

INSERT INTO "menus" (id, name, label, "sortOrder", "menuGroup", "isPublic", "isActive", "mtId1", "recordCreatedDate", "recordModifiedDate")
SELECT encode(gen_random_bytes(12), 'hex'), m.name, m.label, m.sort, '', true, true, '*', now(), now()
FROM (VALUES ('form:rental', 'Rentals', 8), ('form:equipment_item', 'Equipment', 10), ('form:customer', 'Customers', 11)) AS m(name, label, sort)
WHERE NOT EXISTS (SELECT 1 FROM "menus" x WHERE x.name = m.name);

UPDATE "menus" SET "isHidden" = true WHERE name = 'Tasks' AND "isHidden" IS NOT TRUE;
