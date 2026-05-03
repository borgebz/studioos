import hashlib


def file_content_hash(f) -> str:
    f.seek(0)
    digest = hashlib.sha256(f.read()).hexdigest()
    f.seek(0)
    return digest


def django_field_file_sha256(field_file) -> str:
    """
    SHA-256 of bytes stored behind a Django ``FieldFile`` / ``ImageField``
    (reads from storage).
    """
    field_file.open("rb")
    try:
        return hashlib.sha256(field_file.read()).hexdigest()
    finally:
        field_file.close()
