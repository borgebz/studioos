from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from inventory.models import Category, SizeSystem, Product


def _is_descendant(parent, child):
    while parent:
        if parent.id == child.id:
            return True
        parent = parent.parent_category
    return False

# GET
def get_category(*, pk):
    try:
        return Category.objects.get(pk=pk)
    except Category.DoesNotExist:
        raise NotFound()


# LIST (hierárquico)
def list_categories(*, parent_category_id=None, is_active=None, size_system_id=None):
    qs = Category.objects.all().prefetch_related("children").select_related("parent")
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
):
    parent = None
    if parent_category_id:
        parent = Category.objects.get(pk=parent_category_id)

    # validar duplicados no mesmo nível
    if Category.objects.filter(
        name__iexact=name.strip(),
        parent_id=parent_category_id
    ).exists():
        raise ValidationError({"messages": ["CategoryAlreadyExists"]})

    size_system = None
    if size_system_id:
        size_system = SizeSystem.objects.filter(
            pk=size_system_id,
            is_active=True
        ).first()
        if not size_system:
            raise ValidationError({"messages": ["InvalidSizeSystem"]})

    category = Category.objects.create(
        name=name.strip(),
        parent=parent,
        size_system_id=size_system_id,
        sort_order=sort_order,
        is_active=is_active,
    )

    # criar subcategorias (com validação)
    if subcategories:
        names = set()

        for sub in subcategories:
            sub_name = sub["name"].strip().lower()

            if sub_name in names:
                raise ValidationError({"messages": ["DuplicateSubcategory"]})

            names.add(sub_name)

            Category.objects.create(
                name=sub["name"].strip(),
                parent=category,
                size_system_id=sub.get("size_system_id", size_system_id),
                sort_order=sub.get("sort_order", 0),
                is_active=sub.get("is_active", True),
            )

    return category


# UPDATE
def update_category(*, category, **data):
    parent_id = data.get("parent_category_id")

    if parent_id:
        parent = Category.objects.get(pk=parent_id)

        if parent.id == category.id:
            raise ValidationError({"messages": ["InvalidParent"]})

        if _is_descendant(parent, category):
            raise ValidationError({"messages": ["CycleDetected"]})

        category.parent = parent

    name = data.get("name", category.name)

    if Category.objects.filter(
        name__iexact=name.strip(),
        parent=category.parent
    ).exclude(pk=category.id).exists():
        raise ValidationError({"messages": ["CategoryAlreadyExists"]})

    category.name = name

    if "size_system_id" in data:
        size_system = SizeSystem.objects.filter(
            pk=data["size_system_id"],
            is_active=True
        ).first()

        if not size_system:
            raise ValidationError({"messages": ["InvalidSizeSystem"]})

        category.size_system = size_system

    if "sort_order" in data:
        category.sort_order = data["sort_order"]

    if "is_active" in data:
        category.is_active = data["is_active"]

    category.save()
    return category


# DELETE
def _get_descendants(category):
    descendants = []
    for child in category.children.all():
        descendants.append(child)
        descendants.extend(_get_descendants(child))
    return descendants


def delete_category(*, category):
    all_categories = [category] + _get_descendants(category)

    if Product.objects.filter(category__in=all_categories).exists():
        raise ValidationError({"messages": ["CategoryHasAssociatedProducts"]})

    category.delete()


# ACTIVATE
def activate_category(*, category):
    category.is_active = True
    category.save()
    return category


# DEACTIVATE
def deactivate_category(*, category):
    category.is_active = False
    category.save()
    return category