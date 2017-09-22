# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0009_graph_source_file_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='graph',
            name='source_file',
            field=models.FileField(upload_to='graphs/%Y/%m/%d', blank=True),
        ),
    ]
