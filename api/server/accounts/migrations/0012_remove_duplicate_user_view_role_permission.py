from django.db import migrations


def migrate_user_view_role_to_role(apps, schema_editor):
    """
    User.Meta once declared custom permission view_role; Role already has Django's
    default view_role — same codename on two content types caused duplicate rows.

    User no longer declares view_role (0011); remove the orphaned Permission and
    map existing grants to Role's view_role.
    """

    Permission = apps.get_model("auth", "Permission")
    Group = apps.get_model("auth", "Group")
    User = apps.get_model("accounts", "User")
    ContentType = apps.get_model("contenttypes", "ContentType")

    user_ct = ContentType.objects.filter(app_label="accounts", model="user").first()
    role_ct = ContentType.objects.filter(app_label="accounts", model="role").first()
    if not user_ct or not role_ct:
        return

    role_view = Permission.objects.filter(
        content_type=role_ct, codename="view_role"
    ).first()
    if not role_view:
        return

    for dup in Permission.objects.filter(content_type=user_ct, codename="view_role"):
        for group in Group.objects.filter(permissions=dup):
            group.permissions.add(role_view)
            group.permissions.remove(dup)
        for user in User.objects.filter(user_permissions=dup):
            user.user_permissions.add(role_view)
            user.user_permissions.remove(dup)
        dup.delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_alter_user_options"),
    ]

    operations = [
        migrations.RunPython(migrate_user_view_role_to_role, noop_reverse),
    ]
