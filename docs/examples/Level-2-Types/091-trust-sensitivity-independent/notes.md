# 091 — trust vs. sensitivity independent

unsafe let = trust axis (has this been validated?). protected = sensitivity axis (should access be restricted?). They are independent. 'unsafe let rawEmails: protected Array<String>' means: untrusted AND sensitive — both simultaneously is valid and meaningful.
