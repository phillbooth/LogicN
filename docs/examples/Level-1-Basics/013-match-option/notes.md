# 013 - match on Option

Every match on Option<T> must handle both Some and None. Missing arms emit LLN-MATCH-001.
