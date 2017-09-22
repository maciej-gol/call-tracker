# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0002_auto_20150616_1439'),
    ]

    operations = [
        migrations.AddField(
            model_name='relation',
            name='type',
            field=models.CharField(default=0, max_length=32, db_index=True),
            preserve_default=False,
        ),
    ]
