# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0004_auto_20150816_2123'),
    ]

    operations = [
        migrations.AlterField(
            model_name='node',
            name='label',
            field=models.CharField(max_length=4096),
        ),
    ]
