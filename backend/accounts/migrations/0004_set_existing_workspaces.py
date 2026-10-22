from django.db import migrations


def set_workspaces(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='freelancer').update(active_workspace='freelancer')


class Migration(migrations.Migration):
    dependencies = [('accounts', '0003_user_unique_user_email_case_insensitive')]
    operations = [migrations.RunPython(set_workspaces, migrations.RunPython.noop)]
