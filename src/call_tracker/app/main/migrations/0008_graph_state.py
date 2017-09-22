# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_auto_20170516_1353'),
    ]

    operations = [
        migrations.AddField(
            model_name='graph',
            name='state',
            field=models.CharField(default='', max_length=64),
            preserve_default=False,
        ),
    ]
