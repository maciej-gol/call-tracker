# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0005_auto_20170329_1501'),
    ]

    operations = [
        migrations.AlterField(
            model_name='node',
            name='label',
            field=models.TextField(),
        ),
    ]
