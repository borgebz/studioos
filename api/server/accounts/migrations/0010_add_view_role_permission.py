from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_add_can_invite_user_permission"),
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
                    ("view_role", "Can view roles"),
                ]
            },
        ),
    ]
