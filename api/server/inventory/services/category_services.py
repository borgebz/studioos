import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from inventory.models import Category, SizeSystem, Product

logger = logging.getLogger(__name__)


def _would_create_cycle(*, category, proposed_parent):
    """True if ``category`` would become an ancestor of ``proposed_parent`` (cycle)."""
    if proposed_parent.id == category.id:
        return True
    current_id = proposed_parent.parent_id
    steps = 0
    max_steps = 10000
    while current_id is not None and steps < max_steps:
        steps += 1
        if current_id == category.id:
            return True
        current_id = (
            Category.objects.filter(pk=current_id)
            .values_list("parent_id", flat=True)
            .first()
        )
    return False


# GET
def get_category(*, pk):
    try:
        return Category.objects.get(pk=pk)
    except Category.DoesNotExist:
        raise AppNotFound("CategoryNotFound")


# LIST (hierárquico)
def list_categories(*, parent_category_id=None, is_active=None, size_system_id=None):
    qs = (
        Category.objects.all()
        .prefetch_related("children")
        .select_related("parent", "size_system")
    )
    if parent_category_id:
        qs = qs.filter(parent_id=parent_category_id)
    else:
        qs = qs.filter(parent__isnull=True)

    if is_active is not None:
        qs = qs.filter(is_active=is_active)

    if size_system_id:
        qs = qs.filter(size_system_id=size_system_id)

    return qs.order_by("sort_order", "name")


# CREATE
@transaction.atomic
def create_category(
    *,
    name,
    parent_category_id=None,
    size_system_id=None,
    sort_order=0,
    is_active=True,
    subcategories=None,
    created_by=None,
):
    parent = None
    if parent_category_id:
        try:
            parent = Category.objects.get(pk=parent_category_id)
        except Category.DoesNotExist:
            raise ValidationError({"messages": ["InvalidParentCategory"]})

    if Category.objects.filter(
        name__iexact=name.strip(), parent_id=parent_category_id
    ).exists():
        raise ValidationError({"messages": ["DuplicateCategoryNameInLevel"]})

    size_system = None
    if size_system_id:
        size_system = SizeSystem.objects.filter(
            pk=size_system_id, is_active=True
        ).first()
        if not size_system:
            raise ValidationError({"messages": ["InvalidSizeSystem"]})

    category = Category(
        name=name.strip(),
        parent=parent,
        size_system_id=size_system_id,
        sort_order=sort_order,
        is_active=is_active,
        created_by=created_by,
    )
    category.full_clean()
    category.save()

    logger.info("Category created: %s", category.pk)

    if subcategories:
        names = set()

        for sub in subcategories:
            sub_name = sub["name"].strip().lower()

            if sub_name in names:
                raise ValidationError({"messages": ["DuplicateCategoryNameInLevel"]})

            names.add(sub_name)

            sub_cat = Category(
                name=sub["name"].strip(),
                parent=category,
                size_system_id=sub.get("size_system_id", size_system_id),
                sort_order=sub.get("sort_order", 0),
                is_active=sub.get("is_active", True),
                created_by=created_by,
            )
            sub_cat.full_clean()
            sub_cat.save()

    return category


# UPDATE
def update_category(*, category, updated_by=None, **data):
    if "parent_category_id" in data:
        parent_id = data["parent_category_id"]
        if parent_id is None:
            category.parent = None
        else:
            try:
                parent = Category.objects.get(pk=parent_id)
            except Category.DoesNotExist:
                raise ValidationError({"messages": ["InvalidParentCategory"]})

            if parent.id == category.id:
                raise ValidationError({"messages": ["CategorySelfReference"]})

            if _would_create_cycle(category=category, proposed_parent=parent):
                raise ValidationError({"messages": ["CategoryHierarchyCycle"]})

            category.parent = parent

    name = data.get("name", category.name)

    if (
        Category.objects.filter(name__iexact=name.strip(), parent=category.parent)
        .exclude(pk=category.id)
        .exists()
    ):
        raise ValidationError({"messages": ["DuplicateCategoryNameInLevel"]})

    category.name = name

    if "size_system_id" in data:
        new_size_system_id = data["size_system_id"]

        if category.size_system_id and category.size_system_id != new_size_system_id:
            raise ValidationError({"messages": ["ImmutableCategorySizeSystem"]})

        if new_size_system_id:
            size_system = SizeSystem.objects.filter(
                pk=new_size_system_id, is_active=True
            ).first()

            if not size_system:
                raise ValidationError({"messages": ["InvalidSizeSystem"]})

            category.size_system = size_system

    if "sort_order" in data:
        category.sort_order = data["sort_order"]

    if "is_active" in data:
        category.is_active = data["is_active"]

    category.updated_by = updated_by
    category.full_clean()
    category.save()
    return category


# DELETE
def _get_descendants(category):
    descendants = []
    for child in category.children.all():
        descendants.append(child)
        descendants.extend(_get_descendants(child))
    return descendants


@transaction.atomic
def delete_category(*, category, deleted_by=None):
    all_categories = [category] + _get_descendants(category)

    if Product.objects.filter(category__in=all_categories).exists():
        logger.warning(
            "Category delete blocked: category %s has associated products",
            category.pk,
        )
        raise ValidationError({"messages": ["CategoryHasAssociatedProducts"]})

    for item in reversed(all_categories):
        item.delete(deleted_by=deleted_by)
    logger.info("Category tree soft-deleted from root %s", category.pk)
    return category


# ACTIVATE
def activate_category(*, category, updated_by=None):
    category.is_active = True
    category.updated_by = updated_by
    category.save()
    return category


# DEACTIVATE
def deactivate_category(*, category, updated_by=None):
    category.is_active = False
    category.updated_by = updated_by
    category.save()
    return category
