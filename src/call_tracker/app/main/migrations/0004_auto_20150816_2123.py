# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0003_relation_type'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='node',
            options={'ordering': ['label']},
        ),
        migrations.AddField(
            model_name='node',
            name='index',
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
