def optional_bool(raw):
    """
    Coerce a query-parameter value to ``bool | None``.

    Accepts common truthy/falsy strings (``"true"``, ``"1"``, ``"yes"`` / ``"false"``,
    ``"0"``, ``"no"``), native ``bool``, or ``None``.
    """
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    s = str(raw).strip().lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None
