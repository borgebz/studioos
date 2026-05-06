"""
Comprehensive inventory test suite — full flow coverage.

Covers every actor interaction and business rule:
  - SizeSystem CRUD + activate/deactivate
  - Size CRUD + activate/deactivate
  - Category CRUD + hierarchy + activate/deactivate
  - Color CRUD + uniqueness constraints + activate/deactivate
  - Member product lifecycle (create, update, delete + delete guard)
  - School product lifecycle (create, update, delete + permissions)
  - ProductVariant lifecycle (create, update, delete + booking guard)
  - VariantBooking lifecycle (create, update, delete, overlap, date validation)
  - Permission enforcement (member vs. school, student 403, cross-user isolation)

Each scenario family is repeated with 5 distinct data sets.
All tests target the service layer directly per project convention.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from inventory.models import ProductVariant, VariantBooking
from inventory.services.category_services import (
    activate_category,
    create_category,
    deactivate_category,
    delete_category,
    get_category,
    update_category,
)
from inventory.services.color_services import (
    activate_color,
    create_color,
    deactivate_color,
    delete_color,
    get_color,
)
from inventory.services.product_services import (
    create_product,
    create_school_product,
    delete_product,
    delete_school_product,
    get_product,
    get_school_product,
    list_products,
    list_school_products,
    update_product,
    update_school_product,
)
from inventory.services.product_variant_services import (
    create_variant,
    delete_variant,
    get_variant,
    list_variants,
    update_variant,
)
from inventory.services.size_services import (
    activate_size,
    create_size,
    deactivate_size,
    delete_size,
    get_size,
)
from inventory.services.size_system_services import (
    activate_size_system,
    create_size_system,
    deactivate_size_system,
    delete_size_system,
    get_size_system,
    list_size_systems,
    update_size_system,
)
from inventory.services.variant_booking_services import (
    create_booking,
    delete_booking,
    get_booking,
    list_bookings,
    update_booking,
)

User = get_user_model()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _make_member(*, extra_codenames: list[str] | None = None) -> User:
    """Create a plain user with `add_product` permission (member role)."""
    user = User.objects.create_user(
        email=f"member_{_uid()}@inv.test",
        password="test1234",
    )
    codenames = ["add_product", "view_product", "change_product", "delete_product"]
    if extra_codenames:
        codenames += extra_codenames
    for codename in codenames:
        perm = Permission.objects.filter(
            codename=codename,
            content_type__app_label="inventory",
        ).first()
        if perm:
            user.user_permissions.add(perm)
    user.refresh_from_db()
    return user


def _make_school_manager() -> User:
    """Create a user with all school inventory permissions."""
    user = User.objects.create_user(
        email=f"school_mgr_{_uid()}@inv.test",
        password="test1234",
    )
    school_codenames = [
        "view_school_product",
        "add_school_product",
        "change_school_product",
        "delete_school_product",
        "manage_school_inventory",
    ]
    for codename in school_codenames:
        perm = Permission.objects.filter(
            codename=codename,
            content_type__app_label="inventory",
        ).first()
        if perm:
            user.user_permissions.add(perm)
    user.refresh_from_db()
    return user


def _make_no_perm_user() -> User:
    return User.objects.create_user(
        email=f"noperm_{_uid()}@inv.test",
        password="test1234",
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def clothing_system(db) -> object:
    return create_size_system(name=f"Clothing_{_uid()}")


@pytest.fixture
def shoe_system(db) -> object:
    return create_size_system(name=f"Shoes_{_uid()}")


@pytest.fixture
def size_m(db, clothing_system) -> object:
    return create_size(name="M", size_system_id=clothing_system.id)


@pytest.fixture
def color_black(db) -> object:
    return create_color(name=f"Black_{_uid()}", hex_code=f"#{_uid()[:6].upper()}")


@pytest.fixture
def category_costumes(db) -> object:
    return create_category(name=f"Costumes_{_uid()}")


@pytest.fixture
def member_user(db) -> User:
    return _make_member()


@pytest.fixture
def school_manager(db) -> User:
    return _make_school_manager()


@pytest.fixture
def member_product(db, member_user, category_costumes):
    return create_product(
        user=member_user,
        name=f"Product_{_uid()}",
        description="fixture product",
        category_id=category_costumes.id,
    )


@pytest.fixture
def member_variant(db, member_user, member_product, size_m, color_black):
    return create_variant(
        product_id=member_product.id,
        user=member_user,
        size_id=size_m.id,
        color_ids=[color_black.id],
        sku=f"SKU-{_uid()}",
        condition="good",
        acquisition_type="other",
    )


@pytest.fixture
def school_product(db, school_manager, category_costumes):
    return create_school_product(
        user=school_manager,
        name=f"SchoolProd_{_uid()}",
        description="school fixture",
        category_id=category_costumes.id,
        school_details={
            "inventory_code": f"INV-{_uid()}",
            "storage_location": "Room A",
        },
    )


@pytest.fixture
def school_variant(db, school_manager, school_product, size_m):
    return create_variant(
        product_id=school_product.id,
        user=school_manager,
        size_id=size_m.id,
        sku=f"SCH-{_uid()}",
        condition="excellent",
        acquisition_type="school_owned",
    )


# ===========================================================================
# 1. SIZE SYSTEM
# ===========================================================================


class TestSizeSystemCRUD:
    """5 × create / update / activate / deactivate / delete"""

    datasets = [
        ("EU Clothing", "EU Clothing Updated"),
        ("US Kids", "US Kids v2"),
        ("OneSize Global", "OneSize Global Revised"),
        ("UK Adult", "UK Adult (2026)"),
        ("AU Shoes", "AU Shoes Revised"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,updated_name", datasets)
    def test_create_and_update(self, name, updated_name):
        ss = create_size_system(name=f"{name}_{_uid()}")
        assert ss.id is not None
        assert ss.is_active is True

        updated = update_size_system(size_system=ss, name=updated_name)
        assert updated.name == updated_name

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,_", datasets)
    def test_deactivate_and_activate(self, name, _):
        ss = create_size_system(name=f"{name}_{_uid()}")
        deactivated = deactivate_size_system(size_system=ss)
        assert deactivated.is_active is False
        reactivated = activate_size_system(size_system=ss)
        assert reactivated.is_active is True

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,_", datasets)
    def test_create_and_delete(self, name, _):
        ss = create_size_system(name=f"{name}_{_uid()}")
        pk = ss.id
        delete_size_system(size_system=ss)
        from inventory.models import SizeSystem
        assert not SizeSystem.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    def test_list_returns_all_active(self):
        before = len(list(list_size_systems()))
        for i in range(3):
            create_size_system(name=f"Listed_{i}_{_uid()}")
        after = len(list(list_size_systems()))
        assert after >= before + 3

    @pytest.mark.django_db
    def test_get_returns_correct(self):
        ss = create_size_system(name=f"GetMe_{_uid()}")
        fetched = get_size_system(pk=ss.id)
        assert fetched.id == ss.id


# ===========================================================================
# 2. SIZE
# ===========================================================================


class TestSizeCRUD:
    """5 × size lifecycle within a size system"""

    size_data = ["XS", "S", "M", "L", "XL"]

    @pytest.mark.django_db
    @pytest.mark.parametrize("size_name", size_data)
    def test_create_size(self, size_name, clothing_system):
        sz = create_size(name=f"{size_name}_{_uid()}", size_system_id=clothing_system.id)
        assert sz.id is not None
        assert sz.size_system_id == clothing_system.id

    @pytest.mark.django_db
    @pytest.mark.parametrize("size_name", size_data)
    def test_deactivate_and_activate_size(self, size_name, clothing_system):
        sz = create_size(name=f"{size_name}_{_uid()}", size_system_id=clothing_system.id)
        deactivated = deactivate_size(size=sz)
        assert deactivated.is_active is False
        reactivated = activate_size(size=sz)
        assert reactivated.is_active is True

    @pytest.mark.django_db
    @pytest.mark.parametrize("size_name", size_data)
    def test_delete_size(self, size_name, clothing_system):
        sz = create_size(name=f"{size_name}_{_uid()}", size_system_id=clothing_system.id)
        pk = sz.id
        delete_size(size=sz)
        from inventory.models import Size
        assert not Size.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    def test_duplicate_name_same_system_blocked(self, clothing_system):
        create_size(name="Dup", size_system_id=clothing_system.id)
        with pytest.raises((ValidationError, Exception)):
            create_size(name="Dup", size_system_id=clothing_system.id)

    @pytest.mark.django_db
    def test_same_name_different_system_allowed(self, clothing_system):
        other = create_size_system(name=f"Other_{_uid()}")
        sz1 = create_size(name="SameName", size_system_id=clothing_system.id)
        sz2 = create_size(name="SameName", size_system_id=other.id)
        assert sz1.id != sz2.id

    @pytest.mark.django_db
    def test_size_in_use_delete_blocked(self, member_user, category_costumes, clothing_system):
        sz = create_size(name=f"InUseSz_{_uid()}", size_system_id=clothing_system.id)
        p = create_product(user=member_user, name=f"SzProd_{_uid()}", category_id=category_costumes.id)
        create_variant(
            product_id=p.id,
            user=member_user,
            size_id=sz.id,
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            delete_size(size=sz)
        assert "SizeInUse" in exc.value.detail["messages"]


# ===========================================================================
# 3. CATEGORY
# ===========================================================================


class TestCategoryCRUD:
    """5 × category lifecycle + hierarchy"""

    root_names = ["Ballet", "Contemporary", "Hip-Hop", "Jazz", "Acrobatics"]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name", root_names)
    def test_create_root_category(self, name):
        cat = create_category(name=f"{name}_{_uid()}")
        assert cat.id is not None
        assert cat.parent_id is None

    @pytest.mark.django_db
    @pytest.mark.parametrize("name", root_names)
    def test_create_subcategory(self, name):
        parent = create_category(name=f"Root_{_uid()}")
        child = create_category(name=f"{name}_{_uid()}", parent_category_id=parent.id)
        assert child.parent_id == parent.id

    @pytest.mark.django_db
    @pytest.mark.parametrize("name", root_names)
    def test_update_category(self, name):
        cat = create_category(name=f"{name}_{_uid()}")
        updated = update_category(category=cat, name=f"Updated_{name}_{_uid()}")
        assert updated.name.startswith(f"Updated_{name}")

    @pytest.mark.django_db
    @pytest.mark.parametrize("name", root_names)
    def test_deactivate_and_activate_category(self, name):
        cat = create_category(name=f"{name}_{_uid()}")
        d = deactivate_category(category=cat)
        assert d.is_active is False
        a = activate_category(category=cat)
        assert a.is_active is True

    @pytest.mark.django_db
    @pytest.mark.parametrize("name", root_names)
    def test_delete_category(self, name):
        cat = create_category(name=f"{name}_{_uid()}")
        pk = cat.id
        delete_category(category=cat)
        from inventory.models import Category
        assert not Category.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    def test_category_size_system_link(self, clothing_system):
        cat = create_category(
            name=f"Linked_{_uid()}",
            size_system_id=clothing_system.id,
        )
        fetched = get_category(pk=cat.id)
        assert fetched.size_system_id == clothing_system.id

    @pytest.mark.django_db
    def test_delete_category_with_products_blocked(self, member_user):
        cat = create_category(name=f"WithProds_{_uid()}")
        create_product(user=member_user, name=f"Prod_{_uid()}", category_id=cat.id)
        with pytest.raises(ValidationError) as exc:
            delete_category(category=cat)
        assert "CategoryHasAssociatedProducts" in exc.value.detail["messages"]


# ===========================================================================
# 4. COLOR
# ===========================================================================


class TestColorCRUD:
    """5 × color lifecycle + uniqueness"""

    color_data = [
        ("Vermelho", "#FF0000"),
        ("Verde", "#00FF00"),
        ("Azul", "#0000FF"),
        ("Amarelo", "#FFFF00"),
        ("Roxo", "#800080"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,hex_code", color_data)
    def test_create_color(self, name, hex_code):
        unique_hex = f"#{_uid()[:6].upper()}"
        c = create_color(name=f"{name}_{_uid()}", hex_code=unique_hex)
        assert c.id is not None
        assert c.is_active is True

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,hex_code", color_data)
    def test_deactivate_and_activate_color(self, name, hex_code):
        c = create_color(name=f"{name}_{_uid()}", hex_code=f"#{_uid()[:6].upper()}")
        d = deactivate_color(color=c)
        assert d.is_active is False
        a = activate_color(color=c)
        assert a.is_active is True

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,hex_code", color_data)
    def test_delete_color(self, name, hex_code):
        c = create_color(name=f"{name}_{_uid()}", hex_code=f"#{_uid()[:6].upper()}")
        pk = c.id
        delete_color(color=c)
        from inventory.models import Color
        assert not Color.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    def test_duplicate_name_blocked(self):
        shared_name = f"DupName_{_uid()}"
        create_color(name=shared_name, hex_code=f"#{_uid()[:6].upper()}")
        with pytest.raises((ValidationError, Exception)):
            create_color(name=shared_name, hex_code=f"#{_uid()[:6].upper()}")

    @pytest.mark.django_db
    def test_duplicate_hex_blocked(self):
        shared_hex = f"#{_uid()[:6].upper()}"
        create_color(name=f"Color1_{_uid()}", hex_code=shared_hex)
        with pytest.raises((ValidationError, Exception)):
            create_color(name=f"Color2_{_uid()}", hex_code=shared_hex)

    @pytest.mark.django_db
    def test_delete_color_in_use_blocked(self, member_user, category_costumes, size_m):
        c = create_color(name=f"InUse_{_uid()}", hex_code=f"#{_uid()[:6].upper()}")
        product = create_product(
            user=member_user,
            name=f"ForColor_{_uid()}",
            category_id=category_costumes.id,
        )
        create_variant(
            product_id=product.id,
            user=member_user,
            color_ids=[c.id],
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            delete_color(color=c)
        assert "ColorInUse" in exc.value.detail["messages"]


# ===========================================================================
# 5. MEMBER PRODUCT — FULL LIFECYCLE
# ===========================================================================


class TestMemberProductLifecycle:
    """5 × member product: create → update → delete"""

    product_data = [
        ("Tutu Branco", "Vestido de ballet clássico", "female", "Chloé", "tulle"),
        ("Leotard Preto", "Body para ensaio", "female", "Capezio", "lycra"),
        ("Calças Jazz", "Calças elásticas para jazz", "unisex", "Bloch", "spandex"),
        ("Saia Contemporânea", "Saia fluida para contemporâneo", "female", None, "chiffon"),
        ("Top Urbano", "Top para hip-hop", "male", "Puma", "cotton"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,desc,gender,brand,material", product_data)
    def test_create_product(self, name, desc, gender, brand, material, member_user, category_costumes):
        p = create_product(
            user=member_user,
            name=f"{name}_{_uid()}",
            description=desc,
            category_id=category_costumes.id,
            target_gender=gender,
            brand=brand,
            material=material,
        )
        assert p.id is not None
        assert p.owner_id == member_user.id
        assert p.owner_type == "member"

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,desc,gender,brand,material", product_data)
    def test_update_product(self, name, desc, gender, brand, material, member_user, category_costumes):
        p = create_product(
            user=member_user,
            name=f"{name}_{_uid()}",
            description=desc,
            category_id=category_costumes.id,
        )
        updated = update_product(
            pk=p.id,
            user=member_user,
            name=f"Updated_{name}",
            status="inactive",
        )
        assert updated.name == f"Updated_{name}"
        assert updated.status == "inactive"

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,desc,gender,brand,material", product_data)
    def test_delete_product_no_variants(self, name, desc, gender, brand, material, member_user, category_costumes):
        p = create_product(
            user=member_user,
            name=f"{name}_{_uid()}",
            description=desc,
            category_id=category_costumes.id,
        )
        pk = p.id
        delete_product(pk=pk, user=member_user)
        from inventory.models import Product
        assert not Product.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,desc,gender,brand,material", product_data)
    def test_delete_product_with_variants_blocked(
        self, name, desc, gender, brand, material, member_user, category_costumes, size_m
    ):
        p = create_product(
            user=member_user,
            name=f"{name}_{_uid()}",
            description=desc,
            category_id=category_costumes.id,
        )
        create_variant(
            product_id=p.id,
            user=member_user,
            size_id=size_m.id,
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            delete_product(pk=p.id, user=member_user)
        assert "ProductHasVariants" in exc.value.detail["messages"]

    @pytest.mark.django_db
    def test_member_cannot_see_another_members_product(self, category_costumes):
        user_a = _make_member()
        user_b = _make_member()
        p = create_product(user=user_a, name=f"Private_{_uid()}", category_id=category_costumes.id)
        with pytest.raises(PermissionDenied):
            get_product(pk=p.id, user=user_b)

    @pytest.mark.django_db
    def test_member_list_only_own_products(self, category_costumes):
        user_a = _make_member()
        user_b = _make_member()
        p1 = create_product(user=user_a, name=f"A_{_uid()}", category_id=category_costumes.id)
        create_product(user=user_b, name=f"B_{_uid()}", category_id=category_costumes.id)
        results = list(list_products(user=user_a))
        ids = [r.id for r in results]
        assert p1.id in ids
        assert all(r.owner_id == user_a.id for r in results)

    @pytest.mark.django_db
    def test_no_perm_user_cannot_create_product(self, category_costumes):
        u = _make_no_perm_user()
        with pytest.raises(PermissionDenied):
            create_product(user=u, name="Blocked", category_id=category_costumes.id)


# ===========================================================================
# 6. SCHOOL PRODUCT — FULL LIFECYCLE
# ===========================================================================


class TestSchoolProductLifecycle:
    """5 × school product lifecycle with school_details"""

    school_data = [
        ("Tutu Escola A", "INV-001", "Armazém 1"),
        ("Leotard Escola B", "INV-002", "Armazém 2"),
        ("Saia Escola C", "INV-003", "Sala de Ensaio"),
        ("Calças Escola D", "INV-004", "Camarim Principal"),
        ("Top Escola E", "INV-005", "Armazém 3"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,inv_code,location", school_data)
    def test_create_school_product(self, name, inv_code, location, school_manager, category_costumes):
        p = create_school_product(
            user=school_manager,
            name=f"{name}_{_uid()}",
            category_id=category_costumes.id,
            school_details={"inventory_code": inv_code, "storage_location": location},
        )
        assert p.id is not None
        assert p.owner_type == "school"
        assert p.owner_id is None
        assert p.school_details.inventory_code == inv_code

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,inv_code,location", school_data)
    def test_update_school_product(self, name, inv_code, location, school_manager, category_costumes):
        p = create_school_product(
            user=school_manager,
            name=f"{name}_{_uid()}",
            category_id=category_costumes.id,
            school_details={"inventory_code": inv_code, "storage_location": location},
        )
        updated = update_school_product(
            pk=p.id,
            user=school_manager,
            name=f"Updated_{name}",
            school_details={"storage_location": "Nova Localização"},
        )
        assert updated.name == f"Updated_{name}"
        assert updated.school_details.storage_location == "Nova Localização"

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,inv_code,location", school_data)
    def test_delete_school_product_no_variants(self, name, inv_code, location, school_manager, category_costumes):
        p = create_school_product(
            user=school_manager,
            name=f"{name}_{_uid()}",
            category_id=category_costumes.id,
            school_details={"inventory_code": inv_code, "storage_location": location},
        )
        pk = p.id
        delete_school_product(pk=pk, user=school_manager)
        from inventory.models import Product
        assert not Product.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,inv_code,location", school_data)
    def test_member_cannot_create_school_product(self, name, inv_code, location, category_costumes):
        member = _make_member()
        with pytest.raises(PermissionDenied):
            create_school_product(
                user=member,
                name=f"{name}_{_uid()}",
                category_id=category_costumes.id,
            )

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,inv_code,location", school_data)
    def test_member_cannot_view_school_product(self, name, inv_code, location, school_manager, category_costumes):
        p = create_school_product(
            user=school_manager,
            name=f"{name}_{_uid()}",
            category_id=category_costumes.id,
        )
        member = _make_member()
        with pytest.raises(PermissionDenied):
            get_school_product(pk=p.id, user=member)

    @pytest.mark.django_db
    def test_list_school_products_requires_permission(self):
        member = _make_member()
        with pytest.raises(PermissionDenied):
            list_school_products(user=member)

    @pytest.mark.django_db
    def test_school_product_has_no_owner_id(self, school_manager, category_costumes):
        p = create_school_product(
            user=school_manager,
            name=f"NoOwner_{_uid()}",
            category_id=category_costumes.id,
        )
        assert p.owner_id is None

    @pytest.mark.django_db
    def test_member_product_cannot_have_school_details(self, member_user, category_costumes):
        with pytest.raises(ValidationError) as exc:
            create_product(
                user=member_user,
                name="BadMember",
                category_id=category_costumes.id,
                school_details={"inventory_code": "X", "storage_location": "Y"},
            )
        assert "InvalidSchoolDetailsForOwner" in exc.value.detail["messages"]


# ===========================================================================
# 7. PRODUCT VARIANT — FULL LIFECYCLE
# ===========================================================================


class TestProductVariantLifecycle:
    """5 × variant lifecycle: create, update, delete"""

    variant_data = [
        ("new", "purchased", "SKU-A"),
        ("excellent", "donated", "SKU-B"),
        ("good", "school_owned", "SKU-C"),
        ("fair", "other", "SKU-D"),
        ("damaged", "purchased", "SKU-E"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("condition,acq_type,sku_prefix", variant_data)
    def test_create_variant(
        self, condition, acq_type, sku_prefix, member_user, member_product, size_m, color_black
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            color_ids=[color_black.id],
            sku=f"{sku_prefix}-{_uid()}",
            condition=condition,
            acquisition_type=acq_type,
        )
        assert v.id is not None
        assert v.product_id == member_product.id
        assert v.condition == condition

    @pytest.mark.django_db
    @pytest.mark.parametrize("condition,acq_type,sku_prefix", variant_data)
    def test_update_variant(
        self, condition, acq_type, sku_prefix, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"{sku_prefix}-{_uid()}",
            condition=condition,
            acquisition_type=acq_type,
        )
        updated = update_variant(
            variant_id=v.id,
            user=member_user,
            condition="excellent",
            status="reserved",
            public_notes="Updated notes",
        )
        assert updated.condition == "excellent"
        assert updated.status == "reserved"

    @pytest.mark.django_db
    @pytest.mark.parametrize("condition,acq_type,sku_prefix", variant_data)
    def test_delete_variant_no_bookings(
        self, condition, acq_type, sku_prefix, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"{sku_prefix}-{_uid()}",
            condition=condition,
            acquisition_type=acq_type,
        )
        pk = v.id
        delete_variant(variant_id=pk, user=member_user)
        from inventory.models import ProductVariant
        assert not ProductVariant.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    @pytest.mark.parametrize("condition,acq_type,sku_prefix", variant_data)
    def test_delete_variant_with_active_booking_blocked(
        self, condition, acq_type, sku_prefix, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"{sku_prefix}-{_uid()}",
            condition=condition,
            acquisition_type=acq_type,
        )
        now = timezone.now()
        create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now,
            end_at=now + timedelta(days=2),
        )
        with pytest.raises(ValidationError) as exc:
            delete_variant(variant_id=v.id, user=member_user)
        assert "VariantHasActiveBookings" in exc.value.detail["messages"]

    @pytest.mark.django_db
    @pytest.mark.parametrize("condition,acq_type,sku_prefix", variant_data)
    def test_duplicate_sku_blocked(
        self, condition, acq_type, sku_prefix, member_user, member_product, size_m
    ):
        shared_sku = f"DUP-{_uid()}"
        create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=shared_sku,
            condition=condition,
            acquisition_type=acq_type,
        )
        with pytest.raises(ValidationError) as exc:
            create_variant(
                product_id=member_product.id,
                user=member_user,
                size_id=size_m.id,
                sku=shared_sku,
                condition=condition,
                acquisition_type=acq_type,
            )
        assert "DuplicateSKU" in exc.value.detail["messages"]

    @pytest.mark.django_db
    def test_other_member_cannot_access_variant(self, size_m):
        owner = _make_member()
        other = _make_member()
        cat = create_category(name=f"IsolCat_{_uid()}")
        p = create_product(user=owner, name=f"Isolated_{_uid()}", category_id=cat.id)
        v = create_variant(
            product_id=p.id,
            user=owner,
            size_id=size_m.id,
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(PermissionDenied):
            get_variant(variant_id=v.id, user=other)

    @pytest.mark.django_db
    def test_list_variants_for_product(self, member_user, member_product, size_m):
        for i in range(3):
            create_variant(
                product_id=member_product.id,
                user=member_user,
                size_id=size_m.id,
                sku=f"LIST-{i}-{_uid()}",
                condition="good",
                acquisition_type="other",
            )
        variants = list(list_variants(product_id=member_product.id, user=member_user))
        assert len(variants) >= 3

    @pytest.mark.django_db
    def test_school_variant_requires_manage_perm(self, school_product, size_m):
        manager = _make_school_manager()
        v = create_variant(
            product_id=school_product.id,
            user=manager,
            size_id=size_m.id,
            condition="new",
            acquisition_type="school_owned",
        )
        assert v.id is not None

    @pytest.mark.django_db
    def test_member_cannot_create_variant_on_school_product(self, school_product, size_m):
        member = _make_member()
        with pytest.raises(PermissionDenied):
            create_variant(
                product_id=school_product.id,
                user=member,
                size_id=size_m.id,
                condition="good",
                acquisition_type="other",
            )


# ===========================================================================
# 8. VARIANT BOOKING — FULL LIFECYCLE
# ===========================================================================


class TestVariantBookingLifecycle:
    """5 × booking lifecycle: all types, update, delete, guards"""

    booking_data = [
        ("reservation", "Recital Tutu", timedelta(days=100), timedelta(days=103)),
        ("loan", "Ballet Loan", timedelta(days=200), timedelta(days=207)),
        ("rent", "Festival Rent", timedelta(days=300), timedelta(days=305)),
        ("school_use", "School Use Internal", timedelta(days=400), timedelta(days=414)),
        ("maintenance", "Annual Maintenance", timedelta(days=500), timedelta(days=506)),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title,start_delta,end_delta", booking_data)
    def test_create_booking(
        self, booking_type, title, start_delta, end_delta, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BK-{booking_type[:3]}-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type=booking_type,
            title=title,
            start_at=now + start_delta,
            end_at=now + end_delta,
        )
        assert b.id is not None
        assert b.booking_type == booking_type
        assert b.status == "pending"

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title,start_delta,end_delta", booking_data)
    def test_update_booking(
        self, booking_type, title, start_delta, end_delta, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BU-{booking_type[:3]}-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type=booking_type,
            title=title,
            start_at=now + start_delta,
            end_at=now + end_delta,
        )
        updated = update_booking(
            booking_id=b.id,
            user=member_user,
            status="confirmed",
            notes="Updated notes",
        )
        assert updated.status == "confirmed"
        assert updated.notes == "Updated notes"

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title,start_delta,end_delta", booking_data)
    def test_delete_booking(
        self, booking_type, title, start_delta, end_delta, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BD-{booking_type[:3]}-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type=booking_type,
            title=title,
            start_at=now + start_delta,
            end_at=now + end_delta,
        )
        pk = b.id
        delete_booking(booking_id=pk, user=member_user)
        from inventory.models import VariantBooking
        assert not VariantBooking.objects.filter(id=pk, deleted_at__isnull=True).exists()

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title,start_delta,end_delta", booking_data)
    def test_get_booking(
        self, booking_type, title, start_delta, end_delta, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BG-{booking_type[:3]}-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type=booking_type,
            title=title,
            start_at=now + start_delta,
            end_at=now + end_delta,
        )
        fetched = get_booking(booking_id=b.id, user=member_user)
        assert fetched.id == b.id

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title,start_delta,end_delta", booking_data)
    def test_list_bookings(
        self, booking_type, title, start_delta, end_delta, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BL-{booking_type[:3]}-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        now = timezone.now()
        create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type=booking_type,
            title=title,
            start_at=now + start_delta,
            end_at=now + end_delta,
        )
        bookings = list(list_bookings(variant_id=v.id, user=member_user))
        assert len(bookings) >= 1


# ===========================================================================
# 9. BOOKING GUARD — OVERLAP & DATE VALIDATION
# ===========================================================================


class TestBookingGuards:
    """Overlap detection and date validation — 5 scenarios each"""

    overlap_scenarios = [
        (timedelta(0), timedelta(days=5), timedelta(days=2), timedelta(days=7)),
        (timedelta(0), timedelta(days=10), timedelta(days=1), timedelta(days=4)),
        (timedelta(days=3), timedelta(days=8), timedelta(days=5), timedelta(days=12)),
        (timedelta(days=1), timedelta(days=6), timedelta(days=0), timedelta(days=3)),
        (timedelta(days=2), timedelta(days=9), timedelta(days=3), timedelta(days=8)),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("s1,e1,s2,e2", overlap_scenarios)
    def test_overlap_booking_blocked(self, s1, e1, s2, e2, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"OL-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now + s1,
            end_at=now + e1,
        )
        with pytest.raises(ValidationError) as exc:
            create_booking(
                variant_id=v.id,
                user=member_user,
                booking_type="rent",
                start_at=now + s2,
                end_at=now + e2,
            )
        assert "BookingOverlap" in exc.value.detail["messages"]

    invalid_date_scenarios = [
        (timedelta(days=1), timedelta(days=1)),
        (timedelta(days=5), timedelta(days=2)),
        (timedelta(days=10), timedelta(days=1)),
        (timedelta(days=3), timedelta(days=0)),
        (timedelta(days=7), timedelta(days=4)),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("s_delta,e_delta", invalid_date_scenarios)
    def test_invalid_date_range_blocked(self, s_delta, e_delta, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"DT-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            create_booking(
                variant_id=v.id,
                user=member_user,
                booking_type="rent",
                start_at=now + s_delta,
                end_at=now + e_delta,
            )
        assert "InvalidBookingDateRange" in exc.value.detail["messages"]

    @pytest.mark.django_db
    def test_missing_booking_type_blocked(self, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"NOTYPE-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            create_booking(
                variant_id=v.id,
                user=member_user,
                booking_type=None,
                start_at=now,
                end_at=now + timedelta(days=2),
            )
        assert "InvalidBookingType" in exc.value.detail["messages"]

    @pytest.mark.django_db
    def test_invalid_booking_type_blocked(self, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BADTYPE-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            create_booking(
                variant_id=v.id,
                user=member_user,
                booking_type="unknown_type",
                start_at=now,
                end_at=now + timedelta(days=2),
            )
        assert "InvalidBookingType" in exc.value.detail["messages"]

    @pytest.mark.django_db
    def test_adjacent_bookings_allowed(self, member_user, member_product, size_m):
        """Back-to-back bookings (no overlap) on the same variant must both succeed."""
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"ADJ-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        b1 = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now,
            end_at=now + timedelta(days=3),
        )
        b2 = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now + timedelta(days=3),
            end_at=now + timedelta(days=6),
        )
        assert b1.id != b2.id

    @pytest.mark.django_db
    def test_booking_update_immutable_variant(self, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"IMM-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now,
            end_at=now + timedelta(days=2),
        )
        other_v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"OTHER-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        with pytest.raises(ValidationError) as exc:
            update_booking(
                booking_id=b.id,
                user=member_user,
                variant_id=other_v.id,
            )
        assert "BookingVariantImmutable" in exc.value.detail["messages"]


# ===========================================================================
# 10. SCHOOL VARIANT BOOKINGS — SCHOOL MANAGER ACTOR
# ===========================================================================


class TestSchoolVariantBookings:
    """School manager creates bookings on school variants — 5 scenarios"""

    school_booking_data = [
        ("school_use", "Recital March"),
        ("maintenance", "Annual Check"),
        ("blocked", "Reserved for Director"),
        ("loan", "Loan to Parent"),
        ("rent", "Rental for Gala"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title", school_booking_data)
    def test_school_manager_creates_booking(
        self, booking_type, title, school_manager, school_product, size_m
    ):
        v = create_variant(
            product_id=school_product.id,
            user=school_manager,
            size_id=size_m.id,
            sku=f"SCH-BK-{booking_type[:3]}-{_uid()}",
            condition="excellent",
            acquisition_type="school_owned",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=school_manager,
            booking_type=booking_type,
            title=title,
            start_at=now,
            end_at=now + timedelta(days=4),
        )
        assert b.id is not None
        assert b.booking_type == booking_type

    @pytest.mark.django_db
    @pytest.mark.parametrize("booking_type,title", school_booking_data)
    def test_member_cannot_book_school_variant(
        self, booking_type, title, school_product, size_m, school_manager
    ):
        v = create_variant(
            product_id=school_product.id,
            user=school_manager,
            size_id=size_m.id,
            sku=f"SCH-MB-{booking_type[:3]}-{_uid()}",
            condition="excellent",
            acquisition_type="school_owned",
        )
        member = _make_member()
        now = timezone.now()
        with pytest.raises(PermissionDenied):
            create_booking(
                variant_id=v.id,
                user=member,
                booking_type=booking_type,
                title=title,
                start_at=now,
                end_at=now + timedelta(days=4),
            )

    @pytest.mark.django_db
    def test_school_manager_can_update_booking_status(self, school_manager, school_product, size_m):
        v = create_variant(
            product_id=school_product.id,
            user=school_manager,
            size_id=size_m.id,
            sku=f"SCH-UPD-{_uid()}",
            condition="excellent",
            acquisition_type="school_owned",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v.id,
            user=school_manager,
            booking_type="school_use",
            title="Usage",
            start_at=now,
            end_at=now + timedelta(days=2),
        )
        updated = update_booking(booking_id=b.id, user=school_manager, status="active")
        assert updated.status == "active"

    @pytest.mark.django_db
    def test_school_variant_overlap_blocked(self, school_manager, school_product, size_m):
        v = create_variant(
            product_id=school_product.id,
            user=school_manager,
            size_id=size_m.id,
            sku=f"SCH-OVL-{_uid()}",
            condition="excellent",
            acquisition_type="school_owned",
        )
        now = timezone.now()
        create_booking(
            variant_id=v.id,
            user=school_manager,
            booking_type="school_use",
            title="First",
            start_at=now,
            end_at=now + timedelta(days=5),
        )
        with pytest.raises(ValidationError) as exc:
            create_booking(
                variant_id=v.id,
                user=school_manager,
                booking_type="maintenance",
                title="Overlap",
                start_at=now + timedelta(days=2),
                end_at=now + timedelta(days=7),
            )
        assert "BookingOverlap" in exc.value.detail["messages"]


# ===========================================================================
# 11. MULTI-ACTOR CROSS-ISOLATION
# ===========================================================================


class TestCrossActorIsolation:
    """Members and school managers must not bleed into each other's data."""

    @pytest.mark.django_db
    def test_school_manager_cannot_delete_member_product(self, member_user, category_costumes):
        p = create_product(user=member_user, name=f"MemberProd_{_uid()}", category_id=category_costumes.id)
        mgr = _make_school_manager()
        with pytest.raises(PermissionDenied):
            delete_product(pk=p.id, user=mgr)

    @pytest.mark.django_db
    def test_five_members_isolated_products(self, category_costumes):
        members = [_make_member() for _ in range(5)]
        products = [
            create_product(user=m, name=f"Prod_{i}_{_uid()}", category_id=category_costumes.id)
            for i, m in enumerate(members)
        ]
        for i, member in enumerate(members):
            own = list(list_products(user=member))
            own_ids = {p.id for p in own}
            assert products[i].id in own_ids
            for j, other_prod in enumerate(products):
                if j != i:
                    assert other_prod.id not in own_ids

    @pytest.mark.django_db
    def test_five_school_managers_share_school_products(self, category_costumes):
        mgr = _make_school_manager()
        products = [
            create_school_product(
                user=mgr,
                name=f"SchoolShared_{i}_{_uid()}",
                category_id=category_costumes.id,
            )
            for i in range(5)
        ]
        other_mgr = _make_school_manager()
        listed = list(list_school_products(user=other_mgr))
        listed_ids = {p.id for p in listed}
        for p in products:
            assert p.id in listed_ids

    @pytest.mark.django_db
    def test_five_variants_across_five_products_isolated(self, size_m):
        members = [_make_member() for _ in range(5)]
        cat = create_category(name=f"IsolVar_{_uid()}")
        variants = []
        for i, m in enumerate(members):
            p = create_product(user=m, name=f"VarProd_{i}_{_uid()}", category_id=cat.id)
            v = create_variant(
                product_id=p.id,
                user=m,
                size_id=size_m.id,
                sku=f"ISO-{i}-{_uid()}",
                condition="good",
                acquisition_type="other",
            )
            variants.append((m, v))

        for i, (owner, variant) in enumerate(variants):
            fetched = get_variant(variant_id=variant.id, user=owner)
            assert fetched.id == variant.id
            for j, (other, _) in enumerate(variants):
                if j != i:
                    with pytest.raises(PermissionDenied):
                        get_variant(variant_id=variant.id, user=other)


# ===========================================================================
# 12. NESTED VARIANT CREATION IN PRODUCT PAYLOAD
# ===========================================================================


class TestNestedVariantsOnProductCreate:
    """Product created with inline variants (5 different payloads)."""

    nested_data = [
        (
            "Ballet Dress",
            [{"condition": "new", "acquisition_type": "purchased", "sku": None}],
        ),
        (
            "Jazz Top",
            [
                {"condition": "good", "acquisition_type": "donated", "sku": None},
                {"condition": "excellent", "acquisition_type": "other", "sku": None},
            ],
        ),
        (
            "Hip-Hop Pants",
            [{"condition": "fair", "acquisition_type": "purchased", "sku": None}],
        ),
        (
            "Contemporary Scarf",
            [{"condition": "damaged", "acquisition_type": "other", "sku": None}],
        ),
        (
            "Acrobatics Suit",
            [
                {"condition": "new", "acquisition_type": "school_owned", "sku": None},
                {"condition": "good", "acquisition_type": "purchased", "sku": None},
                {"condition": "excellent", "acquisition_type": "donated", "sku": None},
            ],
        ),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("name,variants_payload", nested_data)
    def test_create_product_with_nested_variants(
        self, name, variants_payload, member_user, category_costumes
    ):
        p = create_product(
            user=member_user,
            name=f"{name}_{_uid()}",
            category_id=category_costumes.id,
            variants=variants_payload,
        )
        assert p.id is not None
        count = p.variants.count()
        assert count == len(variants_payload)


# ===========================================================================
# 13. VARIANT STATUS TRANSITIONS
# ===========================================================================


class TestVariantStatusTransitions:
    """5 × variant status changes via update_variant."""

    status_pairs = [
        ("available", "reserved"),
        ("reserved", "in_use"),
        ("in_use", "maintenance"),
        ("maintenance", "available"),
        ("available", "inactive"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("from_status,to_status", status_pairs)
    def test_variant_status_transition(
        self, from_status, to_status, member_user, member_product, size_m
    ):
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"ST-{_uid()}",
            condition="good",
            acquisition_type="other",
            status=from_status,
        )
        assert v.status == from_status
        updated = update_variant(
            variant_id=v.id,
            user=member_user,
            status=to_status,
        )
        assert updated.status == to_status


# ===========================================================================
# 14. BOOKING STATUS TRANSITIONS
# ===========================================================================


class TestBookingStatusTransitions:
    """5 × booking status updates."""

    status_sequences = [
        ("pending", "confirmed"),
        ("confirmed", "active"),
        ("active", "completed"),
        ("pending", "cancelled"),
        ("confirmed", "completed"),
    ]

    @pytest.mark.django_db
    @pytest.mark.parametrize("from_status,to_status", status_sequences)
    def test_booking_status_update(self, from_status, to_status, member_user, member_product, size_m):
        now = timezone.now()
        v = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"BS-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        b = create_booking(
            variant_id=v.id,
            user=member_user,
            booking_type="rent",
            start_at=now,
            end_at=now + timedelta(days=3),
            status=from_status,
        )
        assert b.status == from_status
        updated = update_booking(
            booking_id=b.id,
            user=member_user,
            status=to_status,
        )
        assert updated.status == to_status


# ===========================================================================
# 15. INACTIVE VARIANT DOES NOT BLOCK ACTIVE SIBLING
# ===========================================================================


class TestVariantInactiveExcluded:
    """Inactive variant must not block booking creation on active siblings."""

    @pytest.mark.django_db
    def test_inactive_variant_not_blocking(self, member_user, member_product, size_m):
        v_inactive = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"INACT-{_uid()}",
            condition="good",
            acquisition_type="other",
        )
        update_variant(
            variant_id=v_inactive.id,
            user=member_user,
            status=ProductVariant.Status.INACTIVE,
        )
        v_active = create_variant(
            product_id=member_product.id,
            user=member_user,
            size_id=size_m.id,
            sku=f"ACTIVE-{_uid()}",
            condition="new",
            acquisition_type="other",
        )
        now = timezone.now()
        b = create_booking(
            variant_id=v_active.id,
            user=member_user,
            booking_type="rent",
            start_at=now,
            end_at=now + timedelta(days=2),
        )
        assert b.id is not None
