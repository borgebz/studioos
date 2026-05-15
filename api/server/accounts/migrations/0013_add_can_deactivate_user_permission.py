from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_remove_duplicate_user_view_role_permission"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="user",
            options={
                "permissions": [
                    ("can_teach", "Can be assigned teaching modalities"),
                    ("can_list_users", "Can list all users"),
                    ("can_invite_user", "Can issue single and bulk invites"),
                    (
                        "can_participate_in_coaching",
                        "Can be enrolled as a participant in coaching classes",
                    ),
                    ("can_deactivate_user", "Can deactivate user accounts"),
                ]
            },
        ),
    ]
