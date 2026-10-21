# B13 classification delta (entity_type: unclassified -> proposed)

4 masters, 3 modules. Review the `proposed` column; change any value you disagree with, then say apply (or tell me the corrections).
Valid values: operational_workflow | operational_record | catalog | junction | computed

## FLEET-MAINT-PARTS

| data_object | current | proposed | conf | why |
| --- | --- | --- | --- | --- |
| vehicle_parts_inventory | unclassified | operational_record | low | default: per-record, no workflow signal |

## FLEET-MAINT-PM

| data_object | current | proposed | conf | why |
| --- | --- | --- | --- | --- |
| preventive_maintenance_schedules | unclassified | catalog | med | config/reference signal |

## FLEET-MAINT-WORK-ORDER

| data_object | current | proposed | conf | why |
| --- | --- | --- | --- | --- |
| maintenance_defects | unclassified | operational_record | low | default: per-record, no workflow signal |
| vehicle_work_orders | unclassified | operational_workflow | low | workflow keyword (lifecycle not authored yet) |
