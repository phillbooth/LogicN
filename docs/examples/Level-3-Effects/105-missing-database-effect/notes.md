# 105 — Missing database.write effect

**Concept:** Undeclared database.write effect

OrdersDB.insert is a database.write operation. The flow declares effects [] — an empty list — so the compiler raises an error because the effect is used without being declared.

**AI rule:** Every effect used in a flow body must be declared in with effects [...].
